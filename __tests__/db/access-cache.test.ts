// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const execute = vi.fn();
vi.mock('@/src/db', () => ({
  dbAuth: { execute: (...a: unknown[]) => execute(...a) },
  dbConfig: { queueFactor: 12, business: { max: 7, opTimeoutMs: 12000 }, auth: { max: 3, opTimeoutMs: 5000 } },
  dbCounters: { connectionsClosed: 0 },
}));
vi.mock('@/src/db/schema', () => ({ users: {} }));
vi.mock('drizzle-orm', () => ({ eq: () => ({}), sql: (...a: unknown[]) => ({ sql: a }) }));

/** Programme UN chargement de contexte : une seule requête SQL (un seul aller-retour). */
function loadOk(role = 'USER') {
  execute.mockResolvedValueOnce([{
    id: 'u1', role, updated_at: new Date(), name: 'N', email: null, onboarding_completed: true, producer_id: null, memberships: [],
  }]);
}
const loadFails = (code = 'ECONNRESET') => {
  execute.mockRejectedValue(Object.assign(new Error('x'), { code }));
};

let mod: typeof import('@/lib/access-context');
beforeEach(async () => {
  execute.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.resetModules();
  (globalThis as Record<string, unknown>).__ctxCache = undefined;
  (globalThis as Record<string, unknown>).__ctxInflight = undefined;
  mod = await import('@/lib/access-context');
});
afterEach(() => { vi.useRealTimers(); });

describe('cache access-context', () => {
  it('cache frais : 2e appel sans aller-retour DB', async () => {
    loadOk();
    await mod.buildAccessContext('u1');
    await mod.buildAccessContext('u1');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('TTL d\'autorisation très court (≤ 15 s)', () => {
    expect(mod.AUTHZ_CACHE_TTL_MS).toBeLessThanOrEqual(15_000);
  });

  it('fresh:true ignore le cache (action sensible)', async () => {
    loadOk();
    await mod.buildAccessContext('u1');
    loadOk('ADMIN');
    const ctx = await mod.buildAccessContext('u1', { fresh: true });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(ctx.role).toBe('ADMIN');
  });

  it('cache expiré + DB indisponible → ÉCHEC (jamais de contexte périmé servi)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    loadOk('ADMIN');
    await mod.buildAccessContext('u1');
    vi.setSystemTime(Date.now() + mod.AUTHZ_CACHE_TTL_MS + 1000);
    loadFails('ECONNRESET');
    await expect(mod.buildAccessContext('u1')).rejects.toBeDefined();
  });

  it('action sensible + DB indisponible + cache encore frais → ÉCHEC (jamais autorisé depuis le cache)', async () => {
    loadOk('ADMIN');
    await mod.buildAccessContext('u1');
    loadFails('ECONNREFUSED');
    await expect(mod.buildAccessContext('u1', { fresh: true })).rejects.toBeDefined();
  });

  it('invalidateAccessContext purge immédiatement (changement de rôle)', async () => {
    loadOk('USER');
    await mod.buildAccessContext('u1');
    mod.invalidateAccessContext('u1');
    loadOk('ADMIN');
    const ctx = await mod.buildAccessContext('u1');
    expect(ctx.role).toBe('ADMIN');
  });

  it('N appels simultanés = 1 seul chargement (dédoublonnage)', async () => {
    loadOk();
    await Promise.all(Array.from({ length: 20 }, () => mod.buildAccessContext('u1')));
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('UN aller-retour SQL par contexte (débit du pool = connexions ÷ latence)', async () => {
    loadOk();
    await mod.buildAccessContext('u1');
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('le profil d affichage arrive dans le même aller-retour', async () => {
    loadOk();
    const ctx = await mod.buildAccessContext('u1');
    expect(ctx.profile?.name).toBe('N');
  });

  it('utilisateur absent → USER_NOT_FOUND', async () => {
    execute.mockResolvedValueOnce([]);
    await expect(mod.buildAccessContext('ghost')).rejects.toThrow('USER_NOT_FOUND');
  });
});
