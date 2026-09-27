// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMeServer = vi.fn();
const getSession = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('@/lib/session', () => ({ getSessionFromRequest: (...a: unknown[]) => getSession(...a) }));
vi.mock('@/features/auth/services/me.service', () => ({ fetchMeServer: (...a: unknown[]) => fetchMeServer(...a) }));

import { GET } from '@/app/api/me/route';

const pgErr = (code: string) => Object.assign(new Error('x'), { code });
const req = () => new Request('http://localhost/api/me');

beforeEach(() => {
  fetchMeServer.mockReset();
  getSession.mockReset().mockResolvedValue({ userId: 'user-0123456789' });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/me', () => {
  it('200 quand la DB répond', async () => {
    fetchMeServer.mockResolvedValue({ success: true, data: { id: 'u' }, error: null });
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
  it('503 + Retry-After sur connexion refusée', async () => {
    fetchMeServer.mockRejectedValue(pgErr('ECONNREFUSED'));
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
  it('503 + Retry-After sur timeout SQL, et UNE seule tentative côté route (pas de repli lourd)', async () => {
    fetchMeServer.mockRejectedValue(Object.assign(new Error('Failed query: select ...'), { cause: pgErr('57014') }));
    const res = await GET(req());
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(fetchMeServer).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toMatch(/select|Failed query/i);
  });
  it('500 (pas 503) sur vraie erreur logique — non masquée', async () => {
    fetchMeServer.mockRejectedValue(pgErr('42601'));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(res.headers.get('Retry-After')).toBeNull();
  });
  it('401 sans session, sans toucher la DB', async () => {
    getSession.mockResolvedValue(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(fetchMeServer).not.toHaveBeenCalled();
  });
  it('401 si utilisateur introuvable', async () => {
    fetchMeServer.mockResolvedValue({ success: false, data: null, error: 'USER_NOT_FOUND' });
    expect((await GET(req())).status).toBe(401);
  });
});
