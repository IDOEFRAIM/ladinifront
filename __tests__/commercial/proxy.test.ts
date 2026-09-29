import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireCommercial = vi.fn();
vi.mock('@/lib/api-guard', () => ({ requireCommercial: (...a: unknown[]) => requireCommercial(...a) }));

import {
  commercialListProxy,
  commercialDetailProxy,
  commercialFollowUpProxy,
  commercialStatusProxy,
} from '@/features/commercial/server/proxy';

const denied = (status: number) => ({ error: NextResponse.json({ error: 'x' }, { status }), user: null });
const okAs = (id: string) => ({ error: null, user: { id, role: 'COMMERCIAL', name: null, organizations: [], permissions: [] } });

describe('adaptateur commercial : autorisation et hygiène', () => {
  beforeEach(() => {
    process.env.LADINI_BACKEND_URL = 'http://backend:8000';
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    requireCommercial.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('liste : non authentifié -> 401 sans jamais appeler le backend', async () => {
    requireCommercial.mockResolvedValue(denied(401));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations');
    expect((await commercialListProxy(req)).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('liste : rôle non autorisé -> 403 sans appel backend', async () => {
    requireCommercial.mockResolvedValue(denied(403));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations');
    expect((await commercialListProxy(req)).status).toBe(403);
    expect(f).not.toHaveBeenCalled();
  });

  it('liste : appel serveur-à-serveur avec le jeton interne, ne transmet que la liste blanche de paramètres', async () => {
    requireCommercial.mockResolvedValue(okAs('c-1'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations?filter=to_follow_up&sort=recent&evil=1');
    const res = await commercialListProxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/commercial/conversations?filter=to_follow_up&sort=recent');
    expect((init.headers as Record<string, string>)['X-Internal-Token']).toBe('secret-token');
  });

  it('détail : construit /internal/commercial/conversations/{id}', async () => {
    requireCommercial.mockResolvedValue(okAs('c-1'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: 'u-1' }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1');
    await commercialDetailProxy(req, 'u-1');
    expect(String(f.mock.calls[0][0])).toBe('http://backend:8000/internal/commercial/conversations/u-1');
  });

  it("follow-up : actor_id est TOUJOURS celui de la session, jamais une valeur envoyée par le client", async () => {
    requireCommercial.mockResolvedValue(okAs('commercial-legit'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sent: true }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1/follow-up', {
      method: 'POST',
      body: JSON.stringify({ message: 'Bonjour', actor_id: 'usurpateur' }),
    });
    await commercialFollowUpProxy(req, 'u-1');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/commercial/conversations/u-1/follow-up');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ actor_id: 'commercial-legit', message: 'Bonjour' });
  });

  it('follow-up : non authentifié -> 401 sans appel backend', async () => {
    requireCommercial.mockResolvedValue(denied(401));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1/follow-up', {
      method: 'POST',
      body: JSON.stringify({ message: 'x' }),
    });
    expect((await commercialFollowUpProxy(req, 'u-1')).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });

  it('statut : actor_id vient de la session, le statut et l\'assignation sont transmis tels quels', async () => {
    requireCommercial.mockResolvedValue(okAs('commercial-legit'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'RESOLVED' }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED', actor_id: 'usurpateur' }),
    });
    await commercialStatusProxy(req, 'u-1');
    const [, init] = f.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.actor_id).toBe('commercial-legit');
    expect(body.status).toBe('RESOLVED');
  });

  it('les erreurs de validation du backend sont relayées (400/404/409) ; les erreurs internes deviennent un 502 générique', async () => {
    requireCommercial.mockResolvedValue(okAs('c-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Compte non actif.' }), { status: 409 })));
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1/follow-up', { method: 'POST', body: JSON.stringify({ message: 'x' }) });
    const bad = await commercialFollowUpProxy(req, 'u-1');
    expect(bad.status).toBe(409);
    expect(await bad.json()).toEqual({ error: 'Compte non actif.' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('postgres://user:pass@db/x', { status: 500 })));
    const err = await commercialListProxy(new NextRequest('http://localhost/api/admin/commercial/conversations'));
    expect(err.status).toBe(502);
    expect(JSON.stringify(await err.json())).not.toContain('postgres');
  });

  it('configuration serveur absente : 503 (fail-closed)', async () => {
    requireCommercial.mockResolvedValue(okAs('c-1'));
    delete process.env.INTERNAL_API_TOKEN;
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations');
    expect((await commercialListProxy(req)).status).toBe(503);
  });

  it('corps JSON invalide sur follow-up/status -> 400 avant tout appel backend', async () => {
    requireCommercial.mockResolvedValue(okAs('c-1'));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/commercial/conversations/u-1/follow-up', { method: 'POST', body: 'not-json' });
    expect((await commercialFollowUpProxy(req, 'u-1')).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });
});
