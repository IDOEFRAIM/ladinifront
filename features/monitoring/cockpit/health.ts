import { sql } from 'drizzle-orm';
import { rows, num, numOrNull, ratio } from './db';
import { db } from '@/src/db';
import { getThresholds, stateOf, worst, type HealthState, type Thresholds } from './thresholds';

export interface DependencyHealth {
  key: string;
  label: string;
  state: HealthState;
  lastSuccess: string | null;
  lastFailure: string | null;
  p50: number | null;
  p95: number | null;
  errorRate: number | null;
  samples: number;
  /** origine de la mesure — jamais présenté comme une sonde directe quand il s'agit d'une dérivation */
  source: 'probe' | 'telemetry' | 'derived';
  detail: string;
}

export interface HealthData {
  windowMinutes: number;
  overall: HealthState;
  dependencies: DependencyHealth[];
  /** seuils effectivement appliqués */
  thresholds: Thresholds;
  generatedAt: string;
}

const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : null);

/** Sonde `/health/ready` du backend Python (API + PostgreSQL + Valkey vus du backend). `MONITORING_BACKEND_HEALTH_URL`. */
export async function probeBackend(env: Record<string, string | undefined> = process.env): Promise<{ configured: boolean; ok: boolean; status: number | null; ms: number | null; components: Record<string, string>; error?: string }> {
  const url = env.MONITORING_BACKEND_HEALTH_URL;
  if (!url) return { configured: false, ok: false, status: null, ms: null, components: {} };
  const t0 = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), cache: 'no-store' });
    let components: Record<string, string> = {};
    try {
      components = ((await res.json()) as { components?: Record<string, string> }).components ?? {};
    } catch { /* corps non JSON */ }
    return { configured: true, ok: res.ok, status: res.status, ms: Date.now() - t0, components };
  } catch (e) {
    return { configured: true, ok: false, status: null, ms: null, components: {}, error: (e as Error).name };
  }
}

export async function fetchHealth(windowMinutes = 60, th: Thresholds = getThresholds()): Promise<HealthData> {
  const win = sql.raw(`interval '${Math.min(Math.max(Math.floor(windowMinutes), 5), 1440)} minutes'`);
  const dbT0 = Date.now();
  let dbPingMs: number | null = null;
  try {
    await db.execute(sql`SELECT 1`);
    dbPingMs = Date.now() - dbT0;
  } catch { /* base injoignable : dbPingMs reste null */ }

  const [probe, turns, tools, llm, outbox] = await Promise.all([
    probeBackend(),
    rows<Record<string, unknown>>(sql`
      SELECT count(*) AS n, max(completed_at) AS last_turn,
        max(completed_at) FILTER (WHERE response_status = 'SENT') AS last_sent, max(completed_at) FILTER (WHERE response_status = 'FAILED') AS last_wa_fail,
        count(*) FILTER (WHERE response_status = 'FAILED') AS wa_fail,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY whatsapp_duration_ms) AS wa50, percentile_cont(0.95) WITHIN GROUP (ORDER BY whatsapp_duration_ms) AS wa95,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY db_duration_ms) AS db50, percentile_cont(0.95) WITHIN GROUP (ORDER BY db_duration_ms) AS db95,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY redis_duration_ms) AS r50, percentile_cont(0.95) WITHIN GROUP (ORDER BY redis_duration_ms) AS r95,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY queue_duration_ms) AS q50, percentile_cont(0.95) WITHIN GROUP (ORDER BY queue_duration_ms) AS q95,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS t95,
        count(*) FILTER (WHERE outcome = 'ERROR') AS errs,
        (SELECT max(completed_at) FROM intelligence.agent_turns) AS last_ever
      FROM intelligence.agent_turns WHERE created_at >= now() - ${win}`),
    rows<Record<string, unknown>>(sql`
      SELECT count(*) AS n, count(*) FILTER (WHERE status IN ('ERROR','DENIED')) AS ko,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50, percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
        max(created_at) FILTER (WHERE status IN ('SUCCESS','REPLAY')) AS last_ok, max(created_at) FILTER (WHERE status IN ('ERROR','DENIED')) AS last_ko
      FROM intelligence.agent_tool_calls WHERE created_at >= now() - ${win}`),
    rows<Record<string, unknown>>(sql`
      SELECT CASE WHEN provider ILIKE 'bedrock%' THEN 'bedrock' WHEN provider ILIKE 'groq%' THEN 'groq' ELSE coalesce(provider, 'inconnu') END AS grp,
        count(*) AS n, count(*) FILTER (WHERE status = 'ERROR') AS ko,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS p50, percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95,
        max(created_at) FILTER (WHERE status = 'SUCCESS') AS last_ok, max(created_at) FILTER (WHERE status = 'ERROR') AS last_ko
      FROM intelligence.agent_llm_calls WHERE created_at >= now() - ${win} GROUP BY 1`),
    rows<Record<string, unknown>>(sql`
      SELECT count(*) FILTER (WHERE status = 'PENDING' AND next_attempt_at < now() - interval '10 minutes') AS overdue,
        count(*) FILTER (WHERE status = 'FAILED') AS failed, max(sent_at) AS last_sent, count(*) AS total
      FROM intelligence.notification_outbox WHERE created_at >= now() - interval '7 days'`),
  ]);

  const tr = turns[0] ?? {}, tl = tools[0] ?? {}, ob = outbox[0] ?? {};
  const nTurns = num(tr.n);
  const deps: DependencyHealth[] = [];
  const dep = (d: DependencyHealth) => deps.push(d);

  // API + dépendances vues du backend (sonde directe)
  const apiState: HealthState = !probe.configured ? 'UNKNOWN' : probe.ok ? 'HEALTHY' : probe.status === 503 ? 'DEGRADED' : 'CRITICAL';
  dep({ key: 'api', label: 'API', state: apiState, lastSuccess: probe.ok ? new Date().toISOString() : null, lastFailure: probe.configured && !probe.ok ? new Date().toISOString() : null,
    p50: probe.ms, p95: probe.ms, errorRate: probe.configured ? (probe.ok ? 0 : 1) : null, samples: probe.configured ? 1 : 0, source: 'probe',
    detail: probe.configured ? (probe.ok ? `/health/ready ${probe.status}` : `injoignable ou dégradée (${probe.status ?? probe.error ?? 'aucune réponse'})`) : 'MONITORING_BACKEND_HEALTH_URL non défini : sonde indisponible' });

  const dbState = worst([dbPingMs === null ? 'CRITICAL' : 'HEALTHY', stateOf(numOrNull(tr.db95), th.dbP95Ms), probe.components.database ? (probe.components.database === 'ok' ? 'HEALTHY' : 'CRITICAL') : 'UNKNOWN']);
  dep({ key: 'postgres', label: 'PostgreSQL', state: dbState, lastSuccess: dbPingMs === null ? null : new Date().toISOString(), lastFailure: dbPingMs === null ? new Date().toISOString() : null,
    p50: numOrNull(tr.db50), p95: numOrNull(tr.db95), errorRate: null, samples: nTurns, source: 'probe',
    detail: `ping cockpit ${dbPingMs === null ? 'ÉCHEC' : dbPingMs + ' ms'} · SQL cumulé/tour p95 ${numOrNull(tr.db95) === null ? '—' : Math.round(num(tr.db95)) + ' ms'} · vu du backend : ${probe.components.database ?? 'n/d'}` });

  const redisState = worst([stateOf(numOrNull(tr.r95), th.redisP95Ms), probe.components.redis ? (probe.components.redis === 'ok' ? 'HEALTHY' : 'CRITICAL') : 'UNKNOWN']);
  dep({ key: 'valkey', label: 'Valkey / Redis', state: redisState, lastSuccess: null, lastFailure: null, p50: numOrNull(tr.r50), p95: numOrNull(tr.r95), errorRate: null,
    samples: nTurns, source: probe.components.redis ? 'probe' : 'telemetry', detail: `Redis cumulé/tour p95 ${numOrNull(tr.r95) === null ? '—' : Math.round(num(tr.r95)) + ' ms'} · vu du backend : ${probe.components.redis ?? 'n/d'}` });

  // Workers Celery : aucune sonde directe disponible → dérivé de l'activité réelle des tours (file d'attente + fraîcheur)
  const lastTurn = tr.last_turn ? new Date(String(tr.last_turn)) : null;
  const lastEver = tr.last_ever ? new Date(String(tr.last_ever)) : null;
  const silentMin = lastTurn ? (Date.now() - lastTurn.getTime()) / 60000 : lastEver ? (Date.now() - lastEver.getTime()) / 60000 : null;
  const queueState = nTurns > 0 ? stateOf(numOrNull(tr.q95), { degraded: 5000, critical: 30000 }) : 'UNKNOWN';
  dep({ key: 'celery_interactive', label: 'Celery interactive', state: queueState, lastSuccess: iso(tr.last_turn), lastFailure: null, p50: numOrNull(tr.q50), p95: numOrNull(tr.q95), errorRate: null,
    samples: nTurns, source: 'derived',
    detail: nTurns > 0 ? `temps d'attente en file p95 ${Math.round(num(tr.q95))} ms (dérivé des tours ; pas de sonde worker)` : silentMin === null ? 'aucun tour enregistré' : `aucun tour depuis ${Math.round(silentMin)} min (pas de trafic ≠ panne)` });

  const overdue = num(ob.overdue), failedOb = num(ob.failed);
  const bgState: HealthState = num(ob.total) === 0 ? 'UNKNOWN' : overdue > 20 || failedOb > 20 ? 'CRITICAL' : overdue > 0 || failedOb > 0 ? 'DEGRADED' : 'HEALTHY';
  dep({ key: 'celery_background', label: 'Celery background + Beat', state: bgState, lastSuccess: iso(ob.last_sent), lastFailure: null, p50: null, p95: null,
    errorRate: null, samples: num(ob.total), source: 'derived', detail: num(ob.total) === 0 ? 'aucune notification proactive sur 7 jours' : `outbox : ${overdue} en retard (>10 min), ${failedOb} en échec (dérivé ; pas de sonde Beat)` });

  const toolRate = ratio(num(tl.ko), num(tl.n));
  dep({ key: 'mcp', label: 'MCP (outils)', state: stateOf(toolRate, th.toolErrorRate), lastSuccess: iso(tl.last_ok), lastFailure: iso(tl.last_ko), p50: numOrNull(tl.p50), p95: numOrNull(tl.p95),
    errorRate: toolRate, samples: num(tl.n), source: 'telemetry', detail: `${num(tl.n)} appels d'outils sur la fenêtre` });

  for (const [grp, label] of [['groq', 'Groq'], ['bedrock', 'Bedrock']] as const) {
    const r = llm.find((x) => x.grp === grp);
    const rate = r ? ratio(num(r.ko), num(r.n)) : null;
    dep({ key: grp, label, state: stateOf(rate, th.llmErrorRate), lastSuccess: iso(r?.last_ok), lastFailure: iso(r?.last_ko), p50: numOrNull(r?.p50), p95: numOrNull(r?.p95),
      errorRate: rate, samples: num(r?.n), source: 'telemetry', detail: r ? `${num(r.n)} appels LLM sur la fenêtre` : 'aucun appel sur la fenêtre (provider non utilisé ou pas de trafic)' });
  }

  const waRate = ratio(num(tr.wa_fail), nTurns);
  dep({ key: 'whatsapp', label: 'WhatsApp / Twilio', state: stateOf(waRate, th.whatsappFailureRate), lastSuccess: iso(tr.last_sent), lastFailure: iso(tr.last_wa_fail), p50: numOrNull(tr.wa50), p95: numOrNull(tr.wa95),
    errorRate: waRate, samples: nTurns, source: 'telemetry', detail: `${num(tr.wa_fail)} envois en échec sur ${nTurns} tours` });

  return { windowMinutes, overall: worst(deps.map((d) => d.state)), dependencies: deps, thresholds: th, generatedAt: new Date().toISOString() };
}
