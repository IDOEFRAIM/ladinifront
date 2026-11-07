// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Route /api/conseil (canal web de l'Advisor) : utilisateur non connecté refusé, user_id issu de la session
// uniquement, jeton jamais renvoyé au navigateur, 503 de l'Advisor géré, aucun réessai de POST.

const state = { ctx: { userId: 'user-session-12345' } as { userId: string } | null };

vi.mock('@/lib/api-guard', () => ({
  getAccessContext: vi.fn(async () =>
    state.ctx
      ? { ctx: state.ctx, error: null }
      : { ctx: null, error: NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }) }
  ),
}));

const TOKEN = 'a'.repeat(40);
const fetchMock = vi.fn();

function req(body: unknown) {
  return new NextRequest('http://localhost/api/conseil', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function advisorOk(text = 'Bonjour, comment puis-je aider ?') {
  return new Response(
    JSON.stringify({ request_id: 'x', status: 'CHAT', text, facts: [], gaps: [], escalation: null, pending: null, followup_offers: ['Voir les prix'], meta: {}, trace: { secret: 1 } }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

let POST: (r: NextRequest) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_ADVISOR_CHAT_ENABLED', 'true');
  vi.stubEnv('ADVISOR_BASE_URL', 'http://advisor.internal:8081/');
  vi.stubEnv('ADVISOR_WEB_TOKEN', TOKEN);
  vi.stubEnv('INTERNAL_API_TOKEN', '');
  state.ctx = { userId: 'user-session-12345' };
  ({ POST } = await import('@/app/api/conseil/route'));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('/api/conseil', () => {
  it('404 tant que l\'indicateur est éteint (défaut), sans appel sortant', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADVISOR_CHAT_ENABLED', '');
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuse (401) un utilisateur non connecté, sans appeler l\'Advisor', async () => {
    state.ctx = null;
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('utilise le user_id de la session, jamais celui du corps, et n\'envoie que le contrat', async () => {
    fetchMock.mockResolvedValueOnce(advisorOk());
    const res = await POST(req({ message: 'salut', user_id: 'victime', session_key: 'x', debug: true }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://advisor.internal:8081/advisor/web/chat');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Internal-Token']).toBe(TOKEN);
    const sent = JSON.parse(init.body);
    expect(sent.user_id).toBe('user-session-12345');
    expect(Object.keys(sent).sort()).toEqual(['request_id', 'text', 'user_id']);
    expect(sent.request_id.length).toBeGreaterThan(0);
  });

  it('renvoie text/status/followup_offers sans jeton ni trace interne', async () => {
    fetchMock.mockResolvedValueOnce(advisorOk('Réponse telle quelle'));
    const res = await POST(req({ message: 'salut' }));
    const raw = await res.text();
    expect(raw).not.toContain(TOKEN);
    expect(raw).not.toContain('secret');
    expect(JSON.parse(raw)).toEqual({ text: 'Réponse telle quelle', status: 'CHAT', followup_offers: ['Voir les prix'] });
    expect(res.headers.get('x-internal-token')).toBeNull();
  });

  it('transmet latitude/longitude ensemble, refuse une position incomplète', async () => {
    fetchMock.mockResolvedValueOnce(advisorOk());
    await POST(req({ message: 'ici', latitude: 11.18, longitude: -4.29 }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.latitude).toBe(11.18);
    expect(sent.longitude).toBe(-4.29);

    const bad = await POST(req({ message: 'ici', latitude: 11.18 }));
    expect(bad.status).toBe(422);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('valide le message (vide / trop long) avant tout appel', async () => {
    expect((await POST(req({ message: '   ' }))).status).toBe(422);
    expect((await POST(req({ message: 'x'.repeat(2001) }))).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gère le 503 de l\'Advisor (503 + message neutre) sans réessayer', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 }));
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/indisponible/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ne réessaie jamais après un délai dépassé : 504 et un seul POST', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('401/404 de l\'Advisor (config) : 502 sans fuite du détail', async () => {
    fetchMock.mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(502);
    expect(await res.text()).not.toContain(TOKEN);
  });

  it('503 si ADVISOR_WEB_TOKEN ou ADVISOR_BASE_URL manque, sans appel', async () => {
    vi.stubEnv('ADVISOR_WEB_TOKEN', '');
    vi.stubEnv('INTERNAL_API_TOKEN', '');
    const res = await POST(req({ message: 'salut' }));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('limite le débit par utilisateur (429)', async () => {
    fetchMock.mockImplementation(async () => advisorOk());
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) statuses.push((await POST(req({ message: 'm' + i }))).status);
    expect(statuses.slice(0, 6).every((s) => s === 200)).toBe(true);
    expect(statuses[6]).toBe(429);
  });
});

describe('jeton absent du navigateur', () => {
  it('ADVISOR_WEB_TOKEN n\'est jamais lu sous un nom NEXT_PUBLIC_ ni par du code client', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = process.cwd();
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
      );
    const files = [...walk(join(root, 'features/chat')), ...walk(join(root, 'app/api/conseil'))].filter((f) => /\.(ts|tsx)$/.test(f));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/NEXT_PUBLIC_ADVISOR_WEB_TOKEN/);
      if (/^\s*['"]use client['"]/m.test(src)) expect(src, f).not.toMatch(/ADVISOR_WEB_TOKEN/);
    }
  });
});
