import { sql } from 'drizzle-orm';
import { rows, bounds, num, numOrNull, ratio, pct } from './db';
import type { Period } from './period';
import { maskPhone } from './conversations';

export interface ToolRow {
  toolName: string;
  category: string;
  calls: number;
  success: number;
  errors: number;
  successRate: number | null;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  lastCallAt: string | null;
  lastError: { code: string | null; at: string } | null;
}

/** Outils MCP appelés par l'agent. Succès = SUCCESS ou REPLAY (rejeu idempotent) ; erreur = ERROR ou DENIED. */
export async function fetchTools(p: Period): Promise<ToolRow[]> {
  const b = bounds(p);
  const data = await rows<Record<string, unknown>>(sql`
    SELECT tool_name, (array_agg(tool_category ORDER BY created_at DESC))[1] AS category, count(*) AS calls,
      count(*) FILTER (WHERE status IN ('SUCCESS','REPLAY')) AS ok, count(*) FILTER (WHERE status IN ('ERROR','DENIED')) AS ko,
      ${pct('duration_ms', 0.5)} AS p50, ${pct('duration_ms', 0.95)} AS p95, ${pct('duration_ms', 0.99)} AS p99,
      max(created_at) AS last_call,
      max(created_at) FILTER (WHERE status IN ('ERROR','DENIED')) AS last_err_at,
      (array_agg(error_code ORDER BY created_at DESC) FILTER (WHERE status IN ('ERROR','DENIED')))[1] AS last_err_code
    FROM intelligence.agent_tool_calls WHERE created_at >= ${b.from} AND created_at < ${b.to}
    GROUP BY tool_name ORDER BY calls DESC`);
  return data.map((r) => ({
    toolName: String(r.tool_name), category: String(r.category), calls: num(r.calls), success: num(r.ok), errors: num(r.ko),
    successRate: ratio(num(r.ok), num(r.calls)), p50: numOrNull(r.p50), p95: numOrNull(r.p95), p99: numOrNull(r.p99),
    lastCallAt: r.last_call ? new Date(String(r.last_call)).toISOString() : null,
    lastError: r.last_err_at ? { code: (r.last_err_code as string) ?? null, at: new Date(String(r.last_err_at)).toISOString() } : null,
  }));
}

export interface ToolDetail {
  summary: ToolRow | null;
  /** Les arguments et résultats d'outil ne sont volontairement PAS stockés (secrets / données personnelles). */
  payloadsStored: false;
  recent: { at: string; status: string; durationMs: number; errorCode: string | null; conversationId: string; maskedPhone: string; traceId: string | null }[];
  errorsByCode: { code: string; count: number }[];
  histogram: { label: string; count: number }[];
  total: number;
}

const BUCKETS: [string, number, number][] = [['<50 ms', 0, 50], ['50–200 ms', 50, 200], ['200–500 ms', 200, 500], ['0,5–1 s', 500, 1000], ['1–3 s', 1000, 3000], ['>3 s', 3000, 1e12]];

export async function fetchToolDetail(name: string, p: Period, page: { limit: number; offset: number }): Promise<ToolDetail> {
  const b = bounds(p);
  const all = await fetchTools(p);
  const recent = await rows<Record<string, unknown>>(sql`
    SELECT tc.created_at, tc.status, tc.duration_ms, tc.error_code, tc.trace_id, t.conversation_id, t.phone_last4, count(*) OVER () AS total
    FROM intelligence.agent_tool_calls tc JOIN intelligence.agent_turns t ON t.id = tc.turn_id
    WHERE tc.tool_name = ${name} AND tc.created_at >= ${b.from} AND tc.created_at < ${b.to}
    ORDER BY tc.created_at DESC LIMIT ${page.limit} OFFSET ${page.offset}`);
  const errs = await rows<Record<string, unknown>>(sql`
    SELECT coalesce(error_code, '(sans code)') AS code, count(*) AS n FROM intelligence.agent_tool_calls
    WHERE tool_name = ${name} AND status IN ('ERROR','DENIED') AND created_at >= ${b.from} AND created_at < ${b.to}
    GROUP BY 1 ORDER BY n DESC LIMIT 10`);
  const hist = await rows<Record<string, unknown>>(sql`
    SELECT ${sql.raw(BUCKETS.map(([, lo, hi], i) => `count(*) FILTER (WHERE duration_ms >= ${lo} AND duration_ms < ${hi}) AS b${i}`).join(', '))}
    FROM intelligence.agent_tool_calls WHERE tool_name = ${name} AND created_at >= ${b.from} AND created_at < ${b.to}`);
  return {
    summary: all.find((t) => t.toolName === name) ?? null,
    payloadsStored: false,
    recent: recent.map((r) => ({
      at: new Date(String(r.created_at)).toISOString(), status: String(r.status), durationMs: num(r.duration_ms),
      errorCode: (r.error_code as string) ?? null, conversationId: String(r.conversation_id),
      maskedPhone: maskPhone(r.phone_last4 as string | null), traceId: (r.trace_id as string) ?? null,
    })),
    errorsByCode: errs.map((r) => ({ code: String(r.code), count: num(r.n) })),
    histogram: BUCKETS.map(([label], i) => ({ label, count: num(hist[0]?.[`b${i}`]) })),
    total: recent.length ? num(recent[0].total) : 0,
  };
}
