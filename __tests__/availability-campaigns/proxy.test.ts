import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdmin = vi.fn();
vi.mock('@/lib/api-guard', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

import {
  campaignDetail,
  campaignPreview,
  campaignResults,
  cancelCampaign,
  createCampaign,
  importConsents,
  listCampaigns,
  updateCampaign,
  validateCampaign,
} from '@/features/availability-campaigns/server/proxy';

const ID = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';
const denied = (status: number) => ({ error: NextResponse.json({ error: 'x' }, { status }), user: null });
const okAs = (id: string) => ({ error: null, user: { id, role: 'ADMIN', name: null, organizations: [], permissions: [] } });
const jsonReq = (url: string, body: unknown, method = 'POST') =>
  new NextRequest(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('adaptateur campagnes : autorisation et hygiène', () => {
  beforeEach(() => {
    process.env.LADINI_BACKEND_URL = 'http://backend:8000';
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    requireAdmin.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([401, 403])('non autorisé (%i) : aucun appel au backend', async (status) => {
    requireAdmin.mockResolvedValue(denied(status));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await listCampaigns(new NextRequest('http://localhost/api/admin/availability-campaigns'))).status).toBe(status);
    expect((await createCampaign(jsonReq('http://localhost/api/admin/availability-campaigns', { name: 'x' }))).status).toBe(status);
    expect(f).not.toHaveBeenCalled();
  });

  it('liste : jeton interne, en-têtes no-store, liste blanche de paramètres', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const res = await listCampaigns(new NextRequest('http://localhost/api/admin/availability-campaigns?status=DRAFT&limit=20&evil=1'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/availability-campaigns/campaigns?status=DRAFT&limit=20');
    expect((init.headers as Record<string, string>)['X-Internal-Token']).toBe('secret-token');
  });

  it("écriture : actor_id est TOUJOURS l'administrateur de la session, jamais une valeur du client", async () => {
    requireAdmin.mockResolvedValue(okAs('admin-legit'));
    const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    await createCampaign(jsonReq('http://localhost/api/admin/availability-campaigns', { name: 'Légumes', actor_id: 'usurpateur' }));
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/availability-campaigns/campaigns');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Légumes', actor_id: 'admin-legit' });
    expect(init.method).toBe('POST');
  });

  it('modification : PATCH vers la bonne campagne avec expected_version transmise', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await updateCampaign(jsonReq(`http://localhost/x/${ID}`, { name: 'N', expected_version: 3 }, 'PATCH'), ID);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`http://backend:8000/internal/availability-campaigns/campaigns/${ID}`);
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string).expected_version).toBe(3);
  });

  it('validation : transmet content_hash (garde contre un contenu modifié depuis l’aperçu)', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    const f = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', f);
    await validateCampaign(jsonReq(`http://localhost/x/${ID}/validate`, { content_hash: 'abc' }), ID);
    expect(JSON.parse(f.mock.calls[0][1].body as string)).toEqual({ content_hash: 'abc', actor_id: 'admin-1' });
  });

  it("identifiant non UUID : 400 sans appel backend (aucune injection de chemin)", async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    for (const bad of ['../../secret', 'abc', `${ID}/../x`, '1; drop table']) {
      expect((await campaignDetail(new NextRequest('http://localhost/x'), bad)).status).toBe(400);
      expect((await campaignPreview(new NextRequest('http://localhost/x'), bad)).status).toBe(400);
      expect((await cancelCampaign(jsonReq('http://localhost/x', {}), bad)).status).toBe(400);
    }
    expect(f).not.toHaveBeenCalled();
  });

  it('corps non objet : 400 sans appel backend', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = await importConsents(new NextRequest('http://localhost/x', { method: 'POST', body: '[1,2]', headers: { 'Content-Type': 'application/json' } }));
    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it.each([400, 403, 404, 409, 422])('refus métier %i : le message du backend est transmis tel quel', async (status) => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Le contenu a changé.' }), { status })));
    const res = await validateCampaign(jsonReq(`http://localhost/x/${ID}/validate`, { content_hash: 'old' }), ID);
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe('Le contenu a changé.');
  });

  it('erreur interne du backend : 502 générique, aucun détail ne fuit', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'trace SQL secrète' }), { status: 500 })));
    const res = await campaignResults(new NextRequest('http://localhost/x'), ID);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secrète');
  });

  it('backend injoignable : 502 générique', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED http://backend:8000 token=secret-token')));
    const res = await campaignDetail(new NextRequest('http://localhost/x'), ID);
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('secret-token');
  });

  it('configuration serveur absente : 503, aucun appel', async () => {
    requireAdmin.mockResolvedValue(okAs('admin-1'));
    delete process.env.INTERNAL_API_TOKEN;
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    expect((await listCampaigns(new NextRequest('http://localhost/x'))).status).toBe(503);
    expect(f).not.toHaveBeenCalled();
  });
});
