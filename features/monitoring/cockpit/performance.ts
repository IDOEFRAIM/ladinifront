import { sql } from 'drizzle-orm';
import { rows, bounds, num, numOrNull, ratio, pct, pctArray, pctArrayExpr, at } from './db';
import type { Period } from './period';

export interface Percentiles { p50: number | null; p95: number | null; p99: number | null }

export interface PerformanceData {
  period: { key: string; from: string; to: string };
  turns: number;
  /** Percentiles de la latence d'un tour, période courante vs précédente. */
  current: Percentiles;
  previous: Percentiles;
  /** Percentiles sur les fenêtres fixes 1h / 24h / 7j / 30j (indépendantes de la période choisie). */
  windows: { window: '1h' | '24h' | '7d' | '30d'; turns: number; p50: number | null; p95: number | null; p99: number | null }[];
  /** Tour « typique » : moyenne de chaque poste. SQL et Redis sont transverses (à l'intérieur des autres postes). */
  waterfall: { total: number; queue: number | null; redis: number; db: number; intentLlm: number; mcp: number; responseLlm: number; whatsapp: number | null; other: number };
  components: { key: string; label: string; p50: number | null; p95: number | null; p99: number | null }[];
  series: { bucket: string; turns: number; p50: number | null; p95: number | null }[];
  histogram: { label: string; count: number }[];
  slowest: { id: string; conversationId: string; at: string; durationMs: number; intent: string | null; outcome: string; dominant: string }[];
  llmByProvider: { provider: string; model: string | null; calls: number; errorRate: number | null; fallbacks: number; p50: number | null; p95: number | null }[];
}

const BUCKETS: [string, number, number][] = [['<0,5 s', 0, 500], ['0,5–1 s', 500, 1000], ['1–2 s', 1000, 2000], ['2–5 s', 2000, 5000], ['5–10 s', 5000, 10000], ['>10 s', 10000, 1e12]];
const COMPONENTS: [string, string, string][] = [
  ['total', 'Total', 'duration_ms'], ['queue', 'File Celery', 'queue_duration_ms'], ['redis', 'Redis', 'redis_duration_ms'],
  ['db', 'Base de données', 'db_duration_ms'], ['intentLlm', 'LLM interprétation', 'intent_llm_duration_ms'],
  ['mcp', 'MCP (outils)', 'mcp_duration_ms'], ['responseLlm', 'LLM réponse', 'response_llm_duration_ms'], ['whatsapp', 'WhatsApp/Twilio', 'whatsapp_duration_ms'],
];

export async function fetchPerformance(p: Period): Promise<PerformanceData> {
  const b = bounds(p);
  const W = (expr: string) => sql.raw(expr);
  const [cur] = await rows<Record<string, unknown>>(sql`
    SELECT count(*) AS n, ${pctArray('duration_ms')} AS pcts,
      avg(queue_duration_ms) AS queue, avg(redis_duration_ms) AS redis, avg(db_duration_ms) AS db, avg(intent_llm_duration_ms) AS intent_llm,
      avg(mcp_duration_ms) AS mcp, avg(response_llm_duration_ms) AS resp_llm, avg(whatsapp_duration_ms) AS wa, avg(duration_ms) AS total,
      avg(GREATEST(0, duration_ms - GREATEST(llm_duration_ms, intent_llm_duration_ms + response_llm_duration_ms) - mcp_duration_ms - coalesce(whatsapp_duration_ms, 0))) AS other
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to}`);
  const [prev] = await rows<Record<string, unknown>>(sql`
    SELECT ${pctArray('duration_ms')} AS pcts
    FROM intelligence.agent_turns WHERE created_at >= ${b.prevFrom} AND created_at < ${b.prevTo}`);
  const [win] = await rows<Record<string, unknown>>(sql`
    SELECT ${W(['1 hour', '24 hours', '7 days', '30 days'].map((iv, i) => {
      const f = `FILTER (WHERE created_at >= now() - interval '${iv}')`;
      return `count(*) ${f} AS n${i}, ${pctArrayExpr('duration_ms')} ${f} AS a${i}`;
    }).join(', '))}
    FROM intelligence.agent_turns WHERE created_at >= now() - interval '30 days'`);
  const comp = await rows<Record<string, unknown>>(sql`
    SELECT ${W(COMPONENTS.map(([k, , col]) => `${pctArrayExpr(col)} AS ${k}`).join(', '))}
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to}`);
  const series = await rows<Record<string, unknown>>(sql`
    SELECT date_bin(make_interval(secs => ${p.bucketSeconds}), created_at, ${b.from}) AS bucket, count(*) AS n,
      ${pct('duration_ms', 0.5)} AS p50, ${pct('duration_ms', 0.95)} AS p95
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to} GROUP BY 1 ORDER BY 1`);
  const [hist] = await rows<Record<string, unknown>>(sql`
    SELECT ${W(BUCKETS.map(([, lo, hi], i) => `count(*) FILTER (WHERE duration_ms >= ${lo} AND duration_ms < ${hi}) AS h${i}`).join(', '))}
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to}`);
  const slowest = await rows<Record<string, unknown>>(sql`
    SELECT id, conversation_id, created_at, duration_ms, intent, outcome,
      (ARRAY['LLM','MCP','WhatsApp','DB','Redis','File Celery'])[
        array_position(ARRAY[
          GREATEST(llm_duration_ms, intent_llm_duration_ms + response_llm_duration_ms), mcp_duration_ms, coalesce(whatsapp_duration_ms, 0),
          db_duration_ms, redis_duration_ms, coalesce(queue_duration_ms, 0)],
          GREATEST(llm_duration_ms, intent_llm_duration_ms + response_llm_duration_ms, mcp_duration_ms, coalesce(whatsapp_duration_ms, 0),
                   db_duration_ms, redis_duration_ms, coalesce(queue_duration_ms, 0)))] AS dominant
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to}
    ORDER BY duration_ms DESC LIMIT 10`);
  const llm = await rows<Record<string, unknown>>(sql`
    SELECT coalesce(provider, '(inconnu)') AS provider, (array_agg(model ORDER BY created_at DESC))[1] AS model, count(*) AS n,
      count(*) FILTER (WHERE status = 'ERROR') AS errs, count(*) FILTER (WHERE is_fallback) AS fb,
      ${pct('duration_ms', 0.5)} AS p50, ${pct('duration_ms', 0.95)} AS p95
    FROM intelligence.agent_llm_calls WHERE created_at >= ${b.from} AND created_at < ${b.to} GROUP BY 1 ORDER BY n DESC`);

  const n = num(cur?.n);
  const waterfall = {
    total: Math.round(num(cur?.total)),
    queue: numOrNull(cur?.queue) === null ? null : Math.round(num(cur?.queue)),
    redis: Math.round(num(cur?.redis)), db: Math.round(num(cur?.db)), intentLlm: Math.round(num(cur?.intent_llm)),
    mcp: Math.round(num(cur?.mcp)), responseLlm: Math.round(num(cur?.resp_llm)),
    whatsapp: numOrNull(cur?.wa) === null ? null : Math.round(num(cur?.wa)), other: Math.round(num(cur?.other)),
  };
  const winKeys = ['1h', '24h', '7d', '30d'] as const;
  return {
    period: { key: p.key, from: p.from.toISOString(), to: p.to.toISOString() },
    turns: n,
    current: { p50: at(cur?.pcts, 0), p95: at(cur?.pcts, 1), p99: at(cur?.pcts, 2) },
    previous: { p50: at(prev?.pcts, 0), p95: at(prev?.pcts, 1), p99: at(prev?.pcts, 2) },
    windows: winKeys.map((w, i) => ({ window: w, turns: num(win?.[`n${i}`]), p50: at(win?.[`a${i}`], 0), p95: at(win?.[`a${i}`], 1), p99: at(win?.[`a${i}`], 2) })),
    waterfall,
    components: COMPONENTS.map(([k, label]) => ({ key: k, label, p50: at(comp[0]?.[k], 0), p95: at(comp[0]?.[k], 1), p99: at(comp[0]?.[k], 2) })),
    series: series.map((r) => ({ bucket: new Date(String(r.bucket)).toISOString(), turns: num(r.n), p50: numOrNull(r.p50), p95: numOrNull(r.p95) })),
    histogram: BUCKETS.map(([label], i) => ({ label, count: num(hist?.[`h${i}`]) })),
    slowest: slowest.map((r) => ({
      id: String(r.id), conversationId: String(r.conversation_id), at: new Date(String(r.created_at)).toISOString(),
      durationMs: num(r.duration_ms), intent: (r.intent as string) ?? null, outcome: String(r.outcome), dominant: String(r.dominant ?? 'Autre'),
    })),
    llmByProvider: llm.map((r) => ({
      provider: String(r.provider), model: (r.model as string) ?? null, calls: num(r.n), errorRate: ratio(num(r.errs), num(r.n)),
      fallbacks: num(r.fb), p50: numOrNull(r.p50), p95: numOrNull(r.p95),
    })),
  };
}
