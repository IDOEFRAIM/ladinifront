import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdmin = vi.fn();
vi.mock('@/lib/api-guard', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

import { ALLOWED_PARAMS, METRIC_RE, analyticsProxy, buildUpstreamUrl } from '@/features/analytics/server/proxy';

const req = (qs = '') => new NextRequest(`http://localhost/api/admin/analytics/buyers/overview${qs}`);
const denied = (status: number) => ({ error: NextResponse.json({ error: 'x' }, { status }) });
const okAdmin = { error: null };

describe('adaptateur analytics : autorisation et hygiène', () => {
  beforeEach(() => {
    process.env.LADINI_BACKEND_URL = 'http://backend:8000';
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    requireAdmin.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('non authentifié : 401 sans jamais appeler le backend', async () => {
    requireAdmin.mockResolvedValue(denied(401));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await analyticsProxy(req(), 'overview')).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('non-admin : 403 sans appel backend', async () => {
    requireAdmin.mockResolvedValue(denied(403));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await analyticsProxy(req(), 'overview')).status).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });

  it('admin : appel serveur-à-serveur avec le jeton interne, jamais exposé dans la réponse', async () => {
    requireAdmin.mockResolvedValue(okAdmin);
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ metrics: {} }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const res = await analyticsProxy(req('?from=2026-09-01&to=2026-09-10&evil=1'), 'overview');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/analytics/buyers/overview?from=2026-09-01&to=2026-09-10');
    expect((init.headers as Record<string, string>)['X-Internal-Token']).toBe('secret-token');
    expect(JSON.stringify(await res.json())).not.toContain('secret-token');
  });

  it('les erreurs de validation du backend sont relayées (400) ; les erreurs internes deviennent un 502 générique', async () => {
    requireAdmin.mockResolvedValue(okAdmin);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Zone inconnue.' }), { status: 400 })));
    const bad = await analyticsProxy(req(), 'overview');
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: 'Zone inconnue.' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('postgres://user:pass@db/x', { status: 500 })));
    const err = await analyticsProxy(req(), 'overview');
    expect(err.status).toBe(502);
    expect(JSON.stringify(await err.json())).not.toContain('postgres');

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5')));
    const down = await analyticsProxy(req(), 'overview');
    expect(down.status).toBe(502);
    expect(JSON.stringify(await down.json())).not.toContain('10.0.0.5');
  });

  it('configuration serveur absente : 503 (fail-closed)', async () => {
    requireAdmin.mockResolvedValue(okAdmin);
    delete process.env.INTERNAL_API_TOKEN;
    expect((await analyticsProxy(req(), 'overview')).status).toBe(503);
  });

  it('le contrôle du nom de métrique se fait après lauthentification', async () => {
    requireAdmin.mockResolvedValue(denied(401));
    const pre = vi.fn();
    expect((await analyticsProxy(req(), 'x', pre)).status).toBe(401);
    expect(pre).not.toHaveBeenCalled();
  });
});

describe('construction de lURL amont', () => {
  it('ne transmet que la liste blanche et borne la longueur', () => {
    const src = new URLSearchParams({ from: '2026-09-01', zone_id: 'z', secret: 'x', metric: 'a'.repeat(200) });
    const url = buildUpstreamUrl('http://b/', 'compare', src);
    expect(url).toContain('/internal/analytics/buyers/compare?');
    expect(url).not.toContain('secret');
    expect(url).toContain(`metric=${'a'.repeat(80)}`);
    expect(ALLOWED_PARAMS).toContain('sub_category_id');
  });
  it('un nom de métrique doit être un identifiant simple', () => {
    expect(METRIC_RE.test('recurring_coverage_rate')).toBe(true);
    for (const bad of ['../x', 'a b', 'A', '', "x'; drop", 'a'.repeat(70)]) expect(METRIC_RE.test(bad)).toBe(false);
  });
});
