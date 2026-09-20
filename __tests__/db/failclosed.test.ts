// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const buildAccessContext = vi.fn();
vi.mock('@/lib/access-context', () => ({ buildAccessContext: (...a: unknown[]) => buildAccessContext(...a) }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock('@/lib/session', () => ({ getSessionFromRequest: async () => ({ userId: 'user-0123456789' }) }));
vi.mock('@/src/db', () => ({ db: {} }));
vi.mock('@/src/db/schema', () => ({ userOrganizations: {}, zones: {} }));

import { getAccessContext } from '@/lib/api-guard';
import { secureAction, ADMIN_ROLES } from '@/lib/action-guard';
import { z } from 'zod';

const pgErr = (code: string) => Object.assign(new Error('x'), { code });
const adminCtx = {
  userId: 'user-0123456789', role: 'ADMIN', isGlobalAdmin: true, permissions: new Set(),
  orgScopes: [], organizationIds: [], managedZoneIds: new Set(), permissionVersion: 1,
};
const userCtx = { ...adminCtx, role: 'USER', isGlobalAdmin: false };

beforeEach(() => {
  buildAccessContext.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('fail closed', () => {
  it('DB indisponible + permission admin → refusé en 503 avec Retry-After', async () => {
    buildAccessContext.mockRejectedValue(pgErr('ECONNREFUSED'));
    const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
    expect(ctx).toBeNull();
    expect(error?.status).toBe(503);
    expect(Number(error?.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
  it('timeout SQL sur l auth → 503 (pas 500)', async () => {
    buildAccessContext.mockRejectedValue(Object.assign(new Error('Failed query'), { cause: pgErr('57014') }));
    const { error } = await getAccessContext();
    expect(error?.status).toBe(503);
  });
  it('erreur logique → 500 non masquée en 503', async () => {
    buildAccessContext.mockRejectedValue(pgErr('42601'));
    const { error } = await getAccessContext();
    expect(error?.status).toBe(500);
  });
  it('utilisateur inconnu → 401', async () => {
    buildAccessContext.mockRejectedValue(new Error('USER_NOT_FOUND'));
    const { error } = await getAccessContext();
    expect(error?.status).toBe(401);
  });
  it('routes admin : contexte relu en base (fresh) ; routes normales : cache autorisé', async () => {
    buildAccessContext.mockResolvedValue(adminCtx);
    await getAccessContext(['ADMIN', 'SUPERADMIN']);
    expect(buildAccessContext).toHaveBeenLastCalledWith('user-0123456789', { fresh: true });
    await getAccessContext();
    expect(buildAccessContext).toHaveBeenLastCalledWith('user-0123456789', { fresh: false });
    await getAccessContext(['PRODUCER', 'ADMIN']);
    expect(buildAccessContext).toHaveBeenLastCalledWith('user-0123456789', { fresh: false });
  });
});

describe('secureAction', () => {
  const schema = z.tuple([]);
  it('action sensible → fresh ; action ordinaire → cache', async () => {
    buildAccessContext.mockResolvedValue(userCtx);
    await secureAction({ schema, sensitive: true }, [], async () => 1);
    expect(buildAccessContext).toHaveBeenLastCalledWith('user-0123456789', { fresh: true });
    await secureAction({ schema }, [], async () => 1);
    expect(buildAccessContext).toHaveBeenLastCalledWith('user-0123456789', { fresh: false });
  });
  it('action admin : jamais exécutée si la DB est indisponible', async () => {
    buildAccessContext.mockRejectedValue(pgErr('ECONNRESET'));
    const handler = vi.fn();
    const res = await secureAction({ schema, roles: ADMIN_ROLES }, [], handler);
    expect(res.success).toBe(false);
    expect(handler).not.toHaveBeenCalled();
    expect(res.error).toMatch(/indisponible/i);
  });
  it('opération financière / changement de rôle : refus si DB indisponible', async () => {
    buildAccessContext.mockRejectedValue(pgErr('CONNECT_TIMEOUT'));
    const handler = vi.fn();
    const res = await secureAction({ schema, sensitive: true }, [], handler);
    expect(res.success).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
  it('aucune fuite de SQL / paramètres vers le client', async () => {
    buildAccessContext.mockResolvedValue(userCtx);
    const res = await secureAction({ schema }, [], async () => {
      throw new Error('Failed query: select "password_hash" from users params: secret');
    });
    expect(res.error).not.toMatch(/password_hash|params|select/i);
  });
  it('conflit de concurrence → message de conflit', async () => {
    buildAccessContext.mockResolvedValue(userCtx);
    const { OptimisticConflictError } = await import('@/lib/db-errors');
    const res = await secureAction({ schema }, [], async () => { throw new OptimisticConflictError('product'); });
    expect(res.error).toMatch(/conflit/i);
  });
});
