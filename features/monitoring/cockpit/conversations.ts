import { sql, type SQL } from 'drizzle-orm';
import { rows, bounds, num, numOrNull } from './db';
import type { Period } from './period';
import type { Thresholds } from './thresholds';

export const SESSION_STATUSES = ['ACTIVE', 'WAITING_USER', 'STALLED', 'COMPLETED', 'CLARIFICATION', 'BLOCKED', 'ERROR', 'HUMAN_REQUIRED', 'ABANDONED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ConversationFilters {
  status?: string;
  role?: string;
  intent?: string;
  workflow?: string;
  tool?: string;
  hasError?: boolean;
  minDurationSeconds?: number;
}

export interface ConversationRow {
  id: string;
  /** « +226 •••• 4582 » — jamais le numéro complet */
  maskedPhone: string;
  role: string | null;
  intent: string | null;
  workflow: string | null;
  step: string | null;
  confidence: number | null;
  lastMessage: string | null;
  startedAt: string;
  lastAt: string;
  durationSeconds: number;
  turns: number;
  toolCalls: number;
  status: SessionStatus;
}

export const maskPhone = (last4: string | null | undefined): string => `+226 •••• ${last4 ?? '••••'}`;

/**
 * Statut d'une session (voir docs/monitoring/METRICS.md) :
 *   HUMAN_REQUIRED / BLOCKED / ERROR : issue du dernier tour ;
 *   ACTIVE : dernier tour < activeMinutes ;
 *   sinon CLARIFICATION, COMPLETED (but fermé) ; en attente de l'utilisateur : WAITING_USER,
 *   puis STALLED (≥ stalledMinutes) puis ABANDONED (≥ abandonedMinutes).
 */
export function sessionStatusSql(th: Thresholds): SQL {
  return sql`CASE
    WHEN last_outcome = 'HUMAN_REQUIRED' THEN 'HUMAN_REQUIRED'
    WHEN last_outcome = 'BLOCKED' THEN 'BLOCKED'
    WHEN last_outcome = 'ERROR' THEN 'ERROR'
    WHEN last_at >= now() - make_interval(mins => ${th.activeMinutes}) THEN 'ACTIVE'
    WHEN last_outcome = 'CLARIFICATION' THEN 'CLARIFICATION'
    WHEN last_goal_status = 'COMPLETED' THEN 'COMPLETED'
    WHEN last_outcome = 'WAITING_USER' AND last_at < now() - make_interval(mins => ${th.abandonedMinutes}) THEN 'ABANDONED'
    WHEN last_outcome = 'WAITING_USER' AND last_at < now() - make_interval(mins => ${th.stalledMinutes}) THEN 'STALLED'
    WHEN last_outcome = 'WAITING_USER' THEN 'WAITING_USER'
    ELSE 'COMPLETED' END`;
}

export async function fetchConversations(
  p: Period, th: Thresholds, f: ConversationFilters, page: { limit: number; offset: number },
): Promise<{ data: ConversationRow[]; total: number; limit: number; offset: number }> {
  const b = bounds(p);
  const having: SQL[] = [];
  if (f.role) having.push(sql`bool_or(user_role = ${f.role})`);
  if (f.intent) having.push(sql`bool_or(intent = ${f.intent})`);
  if (f.workflow) having.push(sql`bool_or(workflow = ${f.workflow})`);
  if (f.hasError) having.push(sql`bool_or(error_code IS NOT NULL)`);
  if (f.tool) {
    having.push(sql`conversation_id IN (
      SELECT tt.conversation_id FROM intelligence.agent_turns tt JOIN intelligence.agent_tool_calls tc ON tc.turn_id = tt.id
      WHERE tc.tool_name = ${f.tool} AND tt.created_at >= ${b.from} AND tt.created_at < ${b.to})`);
  }
  if (f.minDurationSeconds && f.minDurationSeconds > 0) {
    having.push(sql`extract(epoch FROM (max(completed_at) - min(started_at))) >= ${f.minDurationSeconds}`);
  }
  const havingSql = having.length ? sql`HAVING ${sql.join(having, sql` AND `)}` : sql``;
  const statusFilter = f.status ? sql`WHERE status = ${f.status}` : sql``;

  const data = await rows<Record<string, unknown>>(sql`
    WITH s AS (
      SELECT conversation_id,
        min(started_at) AS started_at, max(completed_at) AS last_at, count(*) AS turns, sum(mcp_call_count) AS tools,
        (array_agg(phone_last4 ORDER BY started_at DESC))[1] AS last4,
        (array_agg(user_role ORDER BY started_at DESC))[1] AS role,
        (array_agg(intent ORDER BY started_at DESC))[1] AS intent,
        (array_agg(workflow ORDER BY started_at DESC))[1] AS workflow,
        (array_agg(workflow_step ORDER BY started_at DESC))[1] AS step,
        (array_agg(intent_confidence ORDER BY started_at DESC))[1] AS confidence,
        (array_agg(outcome ORDER BY started_at DESC))[1] AS last_outcome,
        (array_agg(goal_status ORDER BY started_at DESC))[1] AS last_goal_status,
        (array_agg(user_message_excerpt ORDER BY started_at DESC))[1] AS last_message
      FROM intelligence.agent_turns
      WHERE created_at >= ${b.from} AND created_at < ${b.to}
      GROUP BY conversation_id ${havingSql}),
    c AS (SELECT s.*, ${sessionStatusSql(th)} AS status FROM s)
    SELECT *, count(*) OVER () AS total FROM c ${statusFilter}
    ORDER BY last_at DESC LIMIT ${page.limit} OFFSET ${page.offset}`);

  return {
    data: data.map((r) => ({
      id: String(r.conversation_id),
      maskedPhone: maskPhone(r.last4 as string | null),
      role: (r.role as string) ?? null,
      intent: (r.intent as string) ?? null,
      workflow: (r.workflow as string) ?? null,
      step: (r.step as string) ?? null,
      confidence: numOrNull(r.confidence),
      lastMessage: (r.last_message as string) ?? null,
      startedAt: new Date(String(r.started_at)).toISOString(),
      lastAt: new Date(String(r.last_at)).toISOString(),
      durationSeconds: Math.max(0, Math.round((new Date(String(r.last_at)).getTime() - new Date(String(r.started_at)).getTime()) / 1000)),
      turns: num(r.turns),
      toolCalls: num(r.tools),
      status: String(r.status) as SessionStatus,
    })),
    total: data.length ? num(data[0].total) : 0,
    limit: page.limit,
    offset: page.offset,
  };
}

// ── Détail d'une session : timeline message → intent → workflow → outil → mutation → réponse ──────────────────────

export type TimelineEvent =
  | { at: string; type: 'USER'; text: string | null }
  | { at: string; type: 'INTENT'; intent: string | null; confidence: number | null; workflow: string | null; step: string | null }
  | { at: string; type: 'TOOL'; name: string; category: string; status: string; durationMs: number; errorCode: string | null; mutation: boolean }
  | { at: string; type: 'LLM'; kind: string; provider: string | null; model: string | null; status: string; durationMs: number; fallback: boolean }
  | { at: string; type: 'BUSINESS'; kind: string; ref: string; amount: number | null }
  | { at: string; type: 'AGENT'; text: string | null; status: string; durationMs: number | null }
  | { at: string; type: 'ERROR'; code: string | null; category: string | null };

export interface TurnDetail {
  id: string;
  startedAt: string;
  outcome: string;
  durationMs: number;
  traceId: string | null;
  traceUrl: string | null;
  breakdown: { queue: number | null; redis: number; db: number; intentLlm: number; mcp: number; responseLlm: number; whatsapp: number | null; other: number };
  events: TimelineEvent[];
}

export interface ToolRow { turn_id: string; name: string; category: string; started_at: string; status: string; duration_ms: number; error_code: string | null }
export interface LlmRow { turn_id: string; seq: number; kind: string; provider: string | null; model: string | null; status: string; duration_ms: number; is_fallback: boolean; created_at: string }
export interface BizRow { turn_id: string; kind: string; ref: string; amount: number | null; at: string }

/** Répartition d'un tour. `other` = temps non attribuable (durée − LLM − MCP − WhatsApp) ; SQL et Redis sont TRANSVERSES
 *  (ils s'exécutent à l'intérieur des autres postes) : affichés à part, sans être soustraits. */
export function breakdownOf(t: Record<string, unknown>): TurnDetail['breakdown'] {
  const dur = num(t.duration_ms);
  const intentLlm = num(t.intent_llm_duration_ms);
  const respLlm = num(t.response_llm_duration_ms);
  const llmAll = Math.max(num(t.llm_duration_ms), intentLlm + respLlm);
  const mcp = num(t.mcp_duration_ms);
  const wa = numOrNull(t.whatsapp_duration_ms);
  return {
    queue: numOrNull(t.queue_duration_ms), redis: num(t.redis_duration_ms), db: num(t.db_duration_ms), intentLlm, mcp,
    responseLlm: respLlm, whatsapp: wa, other: Math.max(0, dur - llmAll - mcp - (wa ?? 0)),
  };
}

export function buildTimeline(t: Record<string, unknown>, tools: ToolRow[], llms: LlmRow[], biz: BizRow[]): TimelineEvent[] {
  const iso = (v: unknown) => new Date(String(v)).toISOString();
  const started = iso(t.started_at);
  const events: TimelineEvent[] = [
    { at: started, type: 'USER', text: (t.user_message_excerpt as string) ?? null },
    { at: started, type: 'INTENT', intent: (t.intent as string) ?? null, confidence: numOrNull(t.intent_confidence), workflow: (t.workflow as string) ?? null, step: (t.workflow_step as string) ?? null },
  ];
  for (const l of llms) events.push({ at: iso(l.created_at), type: 'LLM', kind: l.kind, provider: l.provider, model: l.model, status: l.status, durationMs: num(l.duration_ms), fallback: Boolean(l.is_fallback) });
  for (const x of tools) {
    events.push({ at: iso(x.started_at), type: 'TOOL', name: x.name, category: x.category, status: x.status, durationMs: num(x.duration_ms), errorCode: x.error_code, mutation: x.category === 'WRITE' && (x.status === 'SUCCESS' || x.status === 'REPLAY') });
  }
  for (const r of biz) events.push({ at: iso(r.at), type: 'BUSINESS', kind: r.kind, ref: r.ref, amount: numOrNull(r.amount) });
  if (t.error_code) events.push({ at: iso(t.completed_at), type: 'ERROR', code: t.error_code as string, category: (t.error_category as string) ?? null });
  events.push({ at: iso(t.completed_at), type: 'AGENT', text: (t.agent_response_excerpt as string) ?? null, status: String(t.response_status), durationMs: numOrNull(t.whatsapp_duration_ms) });
  const order = { USER: 0, INTENT: 1, LLM: 2, TOOL: 3, BUSINESS: 4, ERROR: 5, AGENT: 6 } as const;
  return events.sort((a, b) => a.at.localeCompare(b.at) || order[a.type] - order[b.type]);
}

export function traceUrlFor(traceId: string | null, env: Record<string, string | undefined> = process.env): string | null {
  const tpl = env.LANGFUSE_TRACE_URL_TEMPLATE; // ex. https://langfuse.exemple.com/project/xyz/traces/{traceId}
  return tpl && traceId ? tpl.replace('{traceId}', encodeURIComponent(traceId)) : null;
}

export async function fetchConversation(id: string): Promise<{ id: string; maskedPhone: string; role: string | null; turns: TurnDetail[] } | null> {
  const turns = await rows<Record<string, unknown>>(sql`
    SELECT * FROM intelligence.agent_turns WHERE conversation_id = ${id}::uuid ORDER BY started_at LIMIT 200`);
  if (!turns.length) return null;
  const ids = sql.join(turns.map((t) => sql`${String(t.id)}::uuid`), sql`, `);
  const [tools, llms, biz] = await Promise.all([
    rows<ToolRow>(sql`SELECT turn_id::text, tool_name AS name, tool_category AS category, started_at, status, duration_ms, error_code
                      FROM intelligence.agent_tool_calls WHERE turn_id IN (${ids}) ORDER BY seq`),
    rows<LlmRow>(sql`SELECT turn_id::text, seq, kind, provider, model, status, duration_ms, is_fallback, created_at
                     FROM intelligence.agent_llm_calls WHERE turn_id IN (${ids}) ORDER BY seq`),
    // Résultat métier : entités créées par l'utilisateur pendant le tour (fenêtre [début − 2 s, fin + 10 s]).
    rows<BizRow>(sql`
      SELECT t.id::text AS turn_id, x.kind, x.ref, x.amount, x.at
      FROM intelligence.agent_turns t
      CROSS JOIN LATERAL (
        SELECT 'PRODUCT' AS kind, p.id::text AS ref, p.price::float8 AS amount, p.created_at AT TIME ZONE 'UTC' AS at
          FROM marketplace.products p JOIN marketplace.producers pr ON pr.id = p.producer_id
          WHERE pr.user_id = t.user_id AND (p.created_at AT TIME ZONE 'UTC') BETWEEN t.started_at - interval '2 seconds' AND t.completed_at + interval '10 seconds'
        UNION ALL
        SELECT 'ORDER', o.id::text, o.total_amount::float8, o.created_at AT TIME ZONE 'UTC'
          FROM marketplace.orders o JOIN marketplace.buyer_profiles bp ON bp.id = o.buyer_id
          WHERE bp.user_id = t.user_id AND (o.created_at AT TIME ZONE 'UTC') BETWEEN t.started_at - interval '2 seconds' AND t.completed_at + interval '10 seconds'
        UNION ALL
        SELECT 'AUCTION', a.id::text, NULL, a.created_at AT TIME ZONE 'UTC'
          FROM marketplace.auctions a JOIN marketplace.buyer_profiles bp ON bp.id = a.buyer_id
          WHERE bp.user_id = t.user_id AND (a.created_at AT TIME ZONE 'UTC') BETWEEN t.started_at - interval '2 seconds' AND t.completed_at + interval '10 seconds'
        UNION ALL
        SELECT 'BID', bd.id::text, bd.offered_price::float8, bd.created_at AT TIME ZONE 'UTC'
          FROM marketplace.bids bd JOIN marketplace.producers pr ON pr.id = bd.producer_id
          WHERE pr.user_id = t.user_id AND (bd.created_at AT TIME ZONE 'UTC') BETWEEN t.started_at - interval '2 seconds' AND t.completed_at + interval '10 seconds'
      ) x
      WHERE t.id IN (${ids}) AND t.user_id IS NOT NULL`),
  ]);
  const by = <T extends { turn_id: string }>(list: T[]) => list.reduce<Record<string, T[]>>((m, r) => ((m[r.turn_id] ||= []).push(r), m), {});
  const tBy = by(tools), lBy = by(llms), bBy = by(biz);
  return {
    id,
    maskedPhone: maskPhone(turns[turns.length - 1].phone_last4 as string | null),
    role: (turns[turns.length - 1].user_role as string) ?? null,
    turns: turns.map((t) => {
      const tid = String(t.id);
      const traceId = (t.trace_id as string) ?? null;
      return {
        id: tid,
        startedAt: new Date(String(t.started_at)).toISOString(),
        outcome: String(t.outcome),
        durationMs: num(t.duration_ms),
        traceId,
        traceUrl: traceUrlFor(traceId),
        breakdown: breakdownOf(t),
        events: buildTimeline(t, tBy[tid] ?? [], lBy[tid] ?? [], bBy[tid] ?? []),
      };
    }),
  };
}
