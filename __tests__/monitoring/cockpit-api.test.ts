// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/api-guard', () => guard);

const overview = vi.hoisted(() => vi.fn());
const health = vi.hoisted(() => vi.fn());
const conversations = vi.hoisted(() => vi.fn());
const conversation = vi.hoisted(() => vi.fn());
const tools = vi.hoisted(() => vi.fn());
vi.mock('@/features/monitoring/cockpit/overview', () => ({ fetchOverview: overview }));
vi.mock('@/features/monitoring/cockpit/health', () => ({ fetchHealth: health }));
vi.mock('@/features/monitoring/cockpit/conversations', () => ({
  SESSION_STATUSES: ['ACTIVE', 'WAITING_USER', 'STALLED', 'COMPLETED', 'CLARIFICATION', 'BLOCKED', 'ERROR', 'HUMAN_REQUIRED', 'ABANDONED'],
  fetchConversations: conversations,
  fetchConversation: conversation,
}));
vi.mock('@/features/monitoring/cockpit/tools', () => ({ fetchTools: tools, fetchToolDetail: vi.fn() }));

import { GET as getOverview } from '@/app/api/admin/monitoring/overview/route';
import { GET as getConversations } from '@/app/api/admin/monitoring/conversations/route';
import { GET as getConversation } from '@/app/api/admin/monitoring/conversations/[id]/route';
import { GET as getTools } from '@/app/api/admin/monitoring/tools/route';

const req = (path: string) => new NextRequest(`http://localhost${path}`);
const ADMIN = { user: { id: 'u' }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  guard.requireAdmin.mockResolvedValue(ADMIN);
  health.mockResolvedValue({ overall: 'HEALTHY', dependencies: [] });
  overview.mockResolvedValue({ activity: {} });
});

describe('authentification', () => {
  it.each([[401], [403]])('refuse un non-admin (%i) sans jamais toucher à la base', async (status) => {
    guard.requireAdmin.mockResolvedValue({ user: null, error: NextResponse.json({ error: 'no' }, { status }) });
    for (const call of [() => getOverview(req('/x')), () => getConversations(req('/x')), () => getTools(req('/x'))]) {
      expect((await call()).status).toBe(status);
    }
    expect(overview).not.toHaveBeenCalled();
    expect(conversations).not.toHaveBeenCalled();
    expect(tools).not.toHaveBeenCalled();
  });
});

describe('période', () => {
  it('utilise 24h par défaut et transmet le seuil d\'abandon', async () => {
    const res = await getOverview(req('/api/admin/monitoring/overview'));
    expect(res.status).toBe(200);
    const [period, abandoned] = overview.mock.calls[0];
    expect(period.key).toBe('24h');
    expect(abandoned).toBe(30);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it.each(['?period=2y', '?period=custom', '?period=custom&from=2026-01-01&to=2025-01-01', '?period=custom&from=2026-01-01T00:00:00Z&to=2026-06-01T00:00:00Z'])('400 explicite pour %s', async (qs) => {
    const res = await getOverview(req(`/api/admin/monitoring/overview${qs}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(overview).not.toHaveBeenCalled();
  });

  it('accepte une période personnalisée valide', async () => {
    const res = await getOverview(req('/api/admin/monitoring/overview?period=custom&from=2026-09-01T00:00:00Z&to=2026-09-03T00:00:00Z'));
    expect(res.status).toBe(200);
    expect(overview.mock.calls[0][0].key).toBe('custom');
  });
});

describe('conversations : pagination et filtres', () => {
  beforeEach(() => conversations.mockResolvedValue({ data: [], total: 0, limit: 25, offset: 0 }));

  it('borne limit/offset', async () => {
    await getConversations(req('/x?limit=100000&offset=-5'));
    expect(conversations.mock.calls[0][3]).toEqual({ limit: 100, offset: 0 });
    await getConversations(req('/x?limit=abc'));
    expect(conversations.mock.calls[1][3]).toEqual({ limit: 25, offset: 0 });
  });

  it('transmet les filtres validés', async () => {
    await getConversations(req('/x?status=ERROR&role=PRODUCER&intent=SALES_PUBLISH_PRODUCT&tool=create_listing&error=1&minDurationSeconds=30'));
    expect(conversations.mock.calls[0][2]).toMatchObject({ status: 'ERROR', role: 'PRODUCER', intent: 'SALES_PUBLISH_PRODUCT', tool: 'create_listing', hasError: true, minDurationSeconds: 30 });
  });

  it.each(['status=HACKED', "intent=x'; drop table users;--", 'tool=' + 'a'.repeat(200)])('rejette un filtre invalide (%s)', async (qs) => {
    expect((await getConversations(req(`/x?${qs}`))).status).toBe(400);
    expect(conversations).not.toHaveBeenCalled();
  });

  it('données vides → 200 avec liste vide', async () => {
    const res = await getConversations(req('/x'));
    expect(await res.json()).toEqual({ data: [], total: 0, limit: 25, offset: 0 });
  });
});

describe('détail de conversation', () => {
  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it('400 si l\'identifiant n\'est pas un UUID', async () => {
    expect((await getConversation(req('/x'), ctx('1; drop'))).status).toBe(400);
    expect(conversation).not.toHaveBeenCalled();
  });

  it('404 si la session n\'existe pas', async () => {
    conversation.mockResolvedValue(null);
    expect((await getConversation(req('/x'), ctx('11111111-1111-4111-8111-111111111111'))).status).toBe(404);
  });
});

describe('erreurs', () => {
  it('500 générique : le détail de l\'erreur interne n\'est jamais exposé', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    tools.mockRejectedValue(new Error('password authentication failed for user "ladini" host=10.0.0.3'));
    const res = await getTools(req('/x'));
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toMatch(/password|10\.0\.0\.3|ladini/);
    spy.mockRestore();
  });
});
