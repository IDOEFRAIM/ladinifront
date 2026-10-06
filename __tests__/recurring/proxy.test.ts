import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const requireAdmin = vi.fn();
vi.mock('@/lib/api-guard', () => ({ requireAdmin: (...a: unknown[]) => requireAdmin(...a) }));

import {
  recurringNeedDetailProxy,
  recurringNeedsListProxy,
  recurringSettingsGetProxy,
  recurringSettingsPutProxy,
} from '@/features/recurring/server/proxy';

const denied = (status: number) => ({ error: NextResponse.json({ error: 'x' }, { status }), user: null });
const adminAs = (id: string) => ({ error: null, user: { id, role: 'ADMIN', name: null, organizations: [], permissions: [] } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const put = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/recurring/settings', { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });

describe('adaptateur recurring (operations) : autorisation et hygiène', () => {
  beforeEach(() => {
    process.env.LADINI_BACKEND_URL = 'http://backend:8000';
    process.env.INTERNAL_API_TOKEN = 'secret-token';
    requireAdmin.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([401, 403])('non autorisé (%i) -> aucune route n appelle le backend', async (status) => {
    requireAdmin.mockResolvedValue(denied(status));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/recurring/needs');
    expect((await recurringNeedsListProxy(req)).status).toBe(status);
    expect((await recurringNeedDetailProxy(req, 'n-1')).status).toBe(status);
    expect((await recurringSettingsGetProxy(req)).status).toBe(status);
    expect((await recurringSettingsPutProxy(put({ minimum_start_lead_days: 5 }))).status).toBe(status);
    expect(f).not.toHaveBeenCalled();
  });

  it('liste : jeton interne, liste blanche de paramètres, jamais de cache', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    const f = vi.fn().mockResolvedValue(json({ items: [], total: 0 }));
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/recurring/needs?status=ACTIVE&frequency=WEEKLY&product=tom&evil=1&limit=10');
    const res = await recurringNeedsListProxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/recurring-admin/needs?status=ACTIVE&product=tom&frequency=WEEKLY&limit=10');
    expect((init.headers as Record<string, string>)['X-Internal-Token']).toBe('secret-token');
  });

  it('fiche : construit /internal/recurring-admin/needs/{id} avec l id encodé', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    const f = vi.fn().mockResolvedValue(json({ overview: {} }));
    vi.stubGlobal('fetch', f);
    await recurringNeedDetailProxy(new NextRequest('http://localhost/x'), 'a/b');
    expect(f.mock.calls[0][0]).toBe('http://backend:8000/internal/recurring-admin/needs/a%2Fb');
  });

  it('réglage : actor_id est TOUJOURS l admin de la session, jamais celui envoyé par le client', async () => {
    requireAdmin.mockResolvedValue(adminAs('session-admin'));
    const f = vi.fn().mockResolvedValue(json({ recurring: {} }));
    vi.stubGlobal('fetch', f);
    await recurringSettingsPutProxy(put({ actor_id: 'forged', minimum_start_lead_days: 7, expected_version: 2 }));
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://backend:8000/internal/recurring-admin/settings');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({ actor_id: 'session-admin', minimum_start_lead_days: 7, expected_version: 2 });
  });

  it('réglage : la valeur brute est transmise telle quelle (le backend valide, rien n est corrigé en silence)', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    const f = vi.fn().mockResolvedValue(json({ detail: 'Le délai doit être un nombre entier de jours.' }, 422));
    vi.stubGlobal('fetch', f);
    const res = await recurringSettingsPutProxy(put({ minimum_start_lead_days: 2.5 }));
    expect(JSON.parse(f.mock.calls[0][1].body as string).minimum_start_lead_days).toBe(2.5);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/entier/);
  });

  it('réglage : corps invalide -> 400 sans appel backend', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const req = new NextRequest('http://localhost/api/admin/recurring/settings', { method: 'PUT', body: 'pas du json' });
    expect((await recurringSettingsPutProxy(req)).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it.each([403, 404, 409, 422])('les erreurs métier %i gardent leur message', async (status) => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'message métier' }, status)));
    const res = await recurringSettingsPutProxy(put({ minimum_start_lead_days: 5 }));
    expect(res.status).toBe(status);
    expect((await res.json()).error).toBe('message métier');
  });

  it('404 sans message métier (route absente du backend) -> 503 explicite ; 404 métier conservé', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'Not Found' }, 404)));
    const missing = await recurringNeedsListProxy(new NextRequest('http://localhost/x'));
    expect(missing.status).toBe(503);
    expect((await missing.json()).error).toMatch(/pas encore/);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>404</html>', { status: 404 })));
    expect((await recurringNeedsListProxy(new NextRequest('http://localhost/x'))).status).toBe(503);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'Besoin introuvable.' }, 404)));
    const real = await recurringNeedDetailProxy(new NextRequest('http://localhost/x'), 'n-1');
    expect(real.status).toBe(404);
    expect((await real.json()).error).toBe('Besoin introuvable.');
  });

  it('une panne backend ne fuit jamais : 502 générique', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: 'trace interne secrète' }, 500)));
    const res = await recurringNeedsListProxy(new NextRequest('http://localhost/x'));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/secrète|trace/);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5')));
    const res2 = await recurringNeedsListProxy(new NextRequest('http://localhost/x'));
    expect(res2.status).toBe(502);
    expect(JSON.stringify(await res2.json())).not.toMatch(/ECONNREFUSED|10\.0/);
  });

  it('configuration serveur absente -> 503', async () => {
    requireAdmin.mockResolvedValue(adminAs('a-1'));
    delete process.env.INTERNAL_API_TOKEN;
    expect((await recurringNeedsListProxy(new NextRequest('http://localhost/x'))).status).toBe(503);
  });

  it('aucune route d écriture sur un besoin n existe dans cet adaptateur', async () => {
    const mod = await import('@/features/recurring/server/proxy');
    expect(Object.keys(mod).sort()).toEqual([
      'recurringNeedDetailProxy', 'recurringNeedsListProxy', 'recurringSettingsGetProxy', 'recurringSettingsPutProxy',
    ]);
  });
});
