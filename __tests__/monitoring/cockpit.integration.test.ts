// @vitest-environment node
/**
 * Read models du cockpit sur un VRAI PostgreSQL (schéma migré). Activé par MONITORING_TEST_DATABASE_URL
 * (base jetable, VIDE de télémétrie et déjà migrée : `npm run db:migrate`). Les données sont insérées puis supprimées par le test.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const URL_ = process.env.MONITORING_TEST_DATABASE_URL;
const d = URL_ ? describe : describe.skip;

d('cockpit read models (PostgreSQL réel)', () => {
  let client: pg.Client;
  const run = randomUUID().slice(0, 8);
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
  const ids: string[] = [];
  let mods: {
    overview: typeof import('@/features/monitoring/cockpit/overview');
    conv: typeof import('@/features/monitoring/cockpit/conversations');
    wf: typeof import('@/features/monitoring/cockpit/workflows');
    tools: typeof import('@/features/monitoring/cockpit/tools');
    perf: typeof import('@/features/monitoring/cockpit/performance');
    biz: typeof import('@/features/monitoring/cockpit/business');
    health: typeof import('@/features/monitoring/cockpit/health');
    period: typeof import('@/features/monitoring/cockpit/period');
    th: typeof import('@/features/monitoring/cockpit/thresholds');
  };
  const convIds = { publish: randomUUID(), clarif: randomUUID(), error: randomUUID(), stale: randomUUID() };

  async function turn(o: Record<string, unknown>) {
    const base: Record<string, unknown> = {
      conversation_id: convIds.publish, phone_hash: `h-${run}-a`, phone_last4: '4582', outcome: 'COMPLETED', response_status: 'SENT',
      started_at: minutesAgo(1), completed_at: minutesAgo(1), duration_ms: 1200, created_at: minutesAgo(1),
    };
    const row = { ...base, ...o };
    const cols = Object.keys(row);
    const r = await client.query(`insert into intelligence.agent_turns (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) returning id`, Object.values(row));
    ids.push(r.rows[0].id);
    return r.rows[0].id as string;
  }
  const tool = (turnId: string, name: string, category: string, status: string, ms: number, err: string | null = null) =>
    client.query(`insert into intelligence.agent_tool_calls (turn_id, seq, tool_name, tool_category, started_at, completed_at, duration_ms, status, error_code)
                  values ($1, 1, $2, $3, now(), now(), $4, $5, $6)`, [turnId, name, category, ms, status, err]);

  beforeAll(async () => {
    process.env.DATABASE_URL = URL_!;
    process.env.DISABLE_SSLMODE = 'true';
    client = new pg.Client({ connectionString: URL_ });
    await client.connect();
    mods = {
      overview: await import('@/features/monitoring/cockpit/overview'),
      conv: await import('@/features/monitoring/cockpit/conversations'),
      wf: await import('@/features/monitoring/cockpit/workflows'),
      tools: await import('@/features/monitoring/cockpit/tools'),
      perf: await import('@/features/monitoring/cockpit/performance'),
      biz: await import('@/features/monitoring/cockpit/business'),
      health: await import('@/features/monitoring/cockpit/health'),
      period: await import('@/features/monitoring/cockpit/period'),
      th: await import('@/features/monitoring/cockpit/thresholds'),
    };
    // Session « publication » : 2 tours en attente puis un tour qui ferme le but avec une mutation réussie
    await turn({ intent: 'SALES_PUBLISH_PRODUCT', intent_confidence: 0.96, workflow: 'SALES_PUBLISH_PRODUCT', workflow_step: 'ENTER_QUANTITY', goal_status: 'WAITING_INPUT', outcome: 'WAITING_USER', started_at: minutesAgo(4), completed_at: minutesAgo(4), created_at: minutesAgo(4), user_message_excerpt: 'Je veux vendre 50 kg de tomates', agent_response_excerpt: 'Quelle quantité ?' });
    await turn({ intent: 'SALES_PUBLISH_PRODUCT', intent_confidence: 0.9, workflow: 'SALES_PUBLISH_PRODUCT', workflow_step: 'ENTER_PRICE', goal_status: 'WAITING_INPUT', outcome: 'WAITING_USER', started_at: minutesAgo(3), completed_at: minutesAgo(3), created_at: minutesAgo(3) });
    const done = await turn({ intent: 'SALES_PUBLISH_PRODUCT', intent_confidence: 0.94, workflow: 'SALES_PUBLISH_PRODUCT', workflow_step: 'CONFIRM_ACTION', goal_status: 'COMPLETED', mcp_call_count: 2, mcp_duration_ms: 230, llm_call_count: 1, intent_llm_duration_ms: 500, llm_duration_ms: 500, db_duration_ms: 40, redis_duration_ms: 5, whatsapp_duration_ms: 210, queue_duration_ms: 70, duration_ms: 2300, started_at: minutesAgo(2), completed_at: minutesAgo(2), created_at: minutesAgo(2), user_id: null });
    await tool(done, 'find_product', 'READ', 'SUCCESS', 87);
    await tool(done, 'create_listing', 'WRITE', 'SUCCESS', 143);
    await client.query(`insert into intelligence.agent_llm_calls (turn_id, seq, kind, provider, model, duration_ms, status) values ($1,1,'INTERPRETER','groq','llama',500,'SUCCESS')`, [done]);
    // Session en clarification
    await turn({ conversation_id: convIds.clarif, phone_hash: `h-${run}-b`, phone_last4: '1111', intent: 'UNKNOWN_INTENT', intent_confidence: 0.2, outcome: 'CLARIFICATION' });
    // Session en erreur : outil en échec + échec WhatsApp
    const err = await turn({ conversation_id: convIds.error, phone_hash: `h-${run}-c`, phone_last4: '2222', intent: 'BUYER_PREORDER_CONFIRM', workflow: 'BUYER_PREORDER_CONFIRM', outcome: 'ERROR', response_status: 'FAILED', error_code: 'ConnectionError', error_category: 'WHATSAPP', duration_ms: 9000, mcp_call_count: 1 });
    await tool(err, 'confirm_preorder', 'WRITE', 'ERROR', 900, 'ValueError');
    // Session en attente depuis 50 min => abandonnée
    await turn({ conversation_id: convIds.stale, phone_hash: `h-${run}-d`, phone_last4: '3333', intent: 'BUYER_PREORDER_INIT', workflow: 'BUYER_PREORDER_INIT', workflow_step: 'ENTER_QUANTITY', goal_status: 'WAITING_INPUT', outcome: 'WAITING_USER', started_at: minutesAgo(50), completed_at: minutesAgo(50), created_at: minutesAgo(50) });
  });

  afterAll(async () => {
    if (ids.length) await client.query('delete from intelligence.agent_turns where id = any($1::uuid[])', [ids]);
    await client.end();
  });

  const P = (period = '24h') => mods.period.resolvePeriod(new URLSearchParams({ period }));

  it('overview : activité, compréhension, exécution et funnel imbriqué', async () => {
    const o = await mods.overview.fetchOverview(P());
    expect(o.activity.messagesReceived).toBeGreaterThanOrEqual(6);
    expect(o.activity.activeUsers24h).toBeGreaterThanOrEqual(4);
    expect(o.understanding.clarificationRate).toBeGreaterThan(0);
    expect(o.understanding.notUnderstood.some((n) => n.intent.startsWith('UNKNOWN'))).toBe(true);
    expect(o.execution.toolCalls).toBeGreaterThanOrEqual(3);
    expect(o.execution.toolErrors).toBeGreaterThanOrEqual(1);
    const f = Object.fromEntries(o.funnel.map((s) => [s.key, s.count]));
    expect(f.messages).toBeGreaterThanOrEqual(f.understood);
    expect(f.understood).toBeGreaterThanOrEqual(f.workflow);
    expect(f.workflow).toBeGreaterThanOrEqual(f.tool);
    expect(f.tool).toBeGreaterThanOrEqual(f.mutation);
    expect(f.mutation).toBeGreaterThanOrEqual(f.sent);
    expect(f.mutation).toBeGreaterThanOrEqual(1);
    expect(o.funnel[1].pctOfPrevious).toBeLessThanOrEqual(1);
  });

  it('workflows : démarrés / terminés / abandonnés / erreurs + funnel interne', async () => {
    const w = await mods.wf.fetchWorkflows(P(), mods.th.DEFAULT_THRESHOLDS);
    const pub = w.find((x) => x.workflow === 'SALES_PUBLISH_PRODUCT')!;
    expect(pub.completed).toBeGreaterThanOrEqual(1);
    expect(pub.successRate).toBeGreaterThan(0);
    const pre = w.find((x) => x.workflow === 'BUYER_PREORDER_INIT')!;
    expect(pre.abandoned).toBeGreaterThanOrEqual(1);
    expect(w.find((x) => x.workflow === 'BUYER_PREORDER_CONFIRM')!.errors).toBeGreaterThanOrEqual(1);
    const steps = await mods.wf.fetchWorkflowSteps(P(), 'SALES_PUBLISH_PRODUCT');
    expect(steps.steps.map((s) => s.step)).toEqual(expect.arrayContaining(['ENTER_QUANTITY', 'ENTER_PRICE', 'CONFIRM_ACTION']));
  });

  it('conversations : statuts dérivés, masquage du téléphone, filtres, pagination', async () => {
    const all = await mods.conv.fetchConversations(P(), mods.th.DEFAULT_THRESHOLDS, {}, { limit: 50, offset: 0 });
    const byId = Object.fromEntries(all.data.map((c) => [c.id, c]));
    expect(byId[convIds.publish].status).toBe('ACTIVE'); // dernier tour il y a 2 min
    expect(byId[convIds.clarif].status).toBe('ACTIVE');
    expect(byId[convIds.error].status).toBe('ERROR');
    expect(byId[convIds.stale].status).toBe('ABANDONED');
    expect(byId[convIds.publish].maskedPhone).toBe('+226 •••• 4582');
    expect(JSON.stringify(all)).not.toMatch(/\+226\s?\d{2}\s?\d{2}/);
    const onlyErr = await mods.conv.fetchConversations(P(), mods.th.DEFAULT_THRESHOLDS, { status: 'ERROR' }, { limit: 50, offset: 0 });
    expect(onlyErr.data.every((c) => c.status === 'ERROR')).toBe(true);
    const byTool = await mods.conv.fetchConversations(P(), mods.th.DEFAULT_THRESHOLDS, { tool: 'create_listing' }, { limit: 50, offset: 0 });
    expect(byTool.data.map((c) => c.id)).toContain(convIds.publish);
    const page1 = await mods.conv.fetchConversations(P(), mods.th.DEFAULT_THRESHOLDS, {}, { limit: 1, offset: 0 });
    expect(page1.data).toHaveLength(1);
    expect(page1.total).toBeGreaterThanOrEqual(4);
  });

  it('détail de session : timeline message → intent → LLM → outil → réponse, durées et fuseau', async () => {
    const c = await mods.conv.fetchConversation(convIds.publish);
    expect(c!.turns).toHaveLength(3);
    const last = c!.turns[2];
    const types = last.events.map((e) => e.type);
    expect(types[0]).toBe('USER');
    expect(types).toEqual(expect.arrayContaining(['INTENT', 'LLM', 'TOOL', 'AGENT']));
    expect(last.events.find((e) => e.type === 'TOOL' && e.name === 'create_listing')).toMatchObject({ mutation: true, status: 'SUCCESS' });
    expect(last.breakdown.other).toBeGreaterThanOrEqual(0);
    expect(await mods.conv.fetchConversation(randomUUID())).toBeNull();
  });

  it('outils : taux de succès, percentiles, dernière erreur et détail', async () => {
    const t = await mods.tools.fetchTools(P());
    const cl = t.find((x) => x.toolName === 'create_listing')!;
    expect(cl.calls).toBeGreaterThanOrEqual(1);
    expect(cl.p50).not.toBeNull();
    const cp = t.find((x) => x.toolName === 'confirm_preorder')!;
    expect(cp.errors).toBeGreaterThanOrEqual(1);
    expect(cp.lastError?.code).toBe('ValueError');
    const detail = await mods.tools.fetchToolDetail('confirm_preorder', P(), { limit: 10, offset: 0 });
    expect(detail.payloadsStored).toBe(false);
    expect(detail.errorsByCode[0].code).toBe('ValueError');
    expect(detail.recent[0].maskedPhone).toMatch(/^\+226 •••• \d{4}$/);
    expect(detail.histogram.reduce((a, b) => a + b.count, 0)).toBeGreaterThanOrEqual(1);
  });

  it('performance : percentiles, fenêtres fixes, waterfall, histogramme, tours lents', async () => {
    const perf = await mods.perf.fetchPerformance(P());
    expect(perf.current.p50).not.toBeNull();
    expect(perf.current.p99!).toBeGreaterThanOrEqual(perf.current.p50!);
    expect(perf.windows.map((w) => w.window)).toEqual(['1h', '24h', '7d', '30d']);
    expect(perf.windows[1].turns).toBeGreaterThanOrEqual(6);
    expect(perf.waterfall.total).toBeGreaterThan(0);
    expect(perf.histogram.reduce((a, b) => a + b.count, 0)).toBe(perf.turns);
    expect(perf.slowest[0].durationMs).toBeGreaterThanOrEqual(perf.slowest[perf.slowest.length - 1].durationMs);
    expect(perf.llmByProvider.some((l) => l.provider === 'groq')).toBe(true);
  });

  it('business : agrégats réels, métriques indisponibles déclarées, aucune exception sur données vides', async () => {
    const b = await mods.biz.fetchBusiness(P('30d'));
    expect(typeof b.totals.gmvXof).toBe('number');
    expect(b.unavailable.length).toBeGreaterThan(0);
    expect(b.funnel.find((s) => s.key === 'interest')!.count).toBeNull();
    const empty = await mods.biz.fetchBusiness(mods.period.resolvePeriod(new URLSearchParams({ period: 'custom', from: '2000-01-01T00:00:00Z', to: '2000-01-02T00:00:00Z' })));
    expect(empty.totals.orders).toBe(0);
    expect(empty.rates.publicationToOrder).toBeNull();
  });

  it('santé : états dérivés de la télémétrie, sonde absente = UNKNOWN (jamais inventée)', async () => {
    delete process.env.MONITORING_BACKEND_HEALTH_URL;
    const h = await mods.health.fetchHealth(60);
    const byKey = Object.fromEntries(h.dependencies.map((x) => [x.key, x]));
    expect(byKey.api.state).toBe('UNKNOWN');
    expect(byKey.postgres.state).not.toBe('UNKNOWN');
    expect(byKey.whatsapp.errorRate).toBeGreaterThan(0);
    expect(byKey.mcp.samples).toBeGreaterThanOrEqual(3);
    expect(['HEALTHY', 'DEGRADED', 'CRITICAL']).toContain(h.overall);
  });
});
