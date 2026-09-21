import { sql } from 'drizzle-orm';
import { rows, bounds, num, numOrNull, ratio, UNDERSTOOD, pct, pctArray, at } from './db';
import type { Period } from './period';

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  /** % du premier étage */
  pctOfTotal: number | null;
  /** % de l'étage précédent */
  pctOfPrevious: number | null;
  /** perte depuis l'étage précédent */
  lost: number;
}

export interface OverviewData {
  period: { key: string; from: string; to: string };
  activity: { activeUsers24h: number; activeUsers7d: number; conversations: number; messagesReceived: number; messagesSent: number; newUsers: number };
  understanding: {
    recognizedTurns: number;
    recognizedRate: number | null;
    avgConfidence: number | null;
    clarificationRate: number | null;
    fallbackRate: number | null;
    topIntents: { intent: string; count: number; avgConfidence: number | null }[];
    notUnderstood: { intent: string; count: number }[];
  };
  execution: { toolCalls: number; toolSuccess: number; toolErrors: number; workflowsStarted: number; workflowsCompleted: number; workflowsAbandoned: number };
  business: { publications: number; preorders: number; orders: number; auctions: number; bids: number; payments: number; deliveries: number };
  performance: { p50: number | null; p95: number | null; p99: number | null; previous: { p50: number | null; p95: number | null; p99: number | null } };
  funnel: FunnelStage[];
  series: { bucket: string; turns: number; errors: number; p95: number | null }[];
}

/**
 * Vue d'ensemble. Définitions (voir docs/monitoring/METRICS.md) :
 *  - message reçu = 1 tour ; message envoyé = tour dont la réponse est partie (response_status = SENT) ;
 *  - intention comprise = intent renseigné, différent de UNKNOWN*, et tour non terminé en CLARIFICATION ;
 *  - workflow = couple (session, but) ; terminé = un tour a fermé le but ; abandonné = ni terminé ni en erreur et
 *    sans activité depuis `abandonedMinutes`.
 */
export async function fetchOverview(p: Period, abandonedMinutes = 30): Promise<OverviewData> {
  const b = bounds(p);
  const [turnAgg] = await rows<Record<string, unknown>>(sql`
    SELECT
      count(*) AS turns,
      count(*) FILTER (WHERE response_status = 'SENT') AS sent,
      count(DISTINCT conversation_id) AS conversations,
      count(*) FILTER (WHERE ${UNDERSTOOD}) AS recognized,
      avg(intent_confidence) AS avg_conf,
      count(*) FILTER (WHERE outcome = 'CLARIFICATION') AS clarif,
      count(*) FILTER (WHERE outcome IN ('ERROR','FALLBACK')) AS fallback,
      ${pctArray('duration_ms')} AS pcts
    FROM intelligence.agent_turns t WHERE created_at >= ${b.from} AND created_at < ${b.to}`);
  const [prevAgg] = await rows<Record<string, unknown>>(sql`
    SELECT ${pctArray('duration_ms')} AS pcts
    FROM intelligence.agent_turns WHERE created_at >= ${b.prevFrom} AND created_at < ${b.prevTo}`);
  const [users] = await rows<Record<string, unknown>>(sql`
    SELECT
      (SELECT count(DISTINCT phone_hash) FROM intelligence.agent_turns WHERE created_at >= now() - interval '24 hours') AS a24,
      (SELECT count(DISTINCT phone_hash) FROM intelligence.agent_turns WHERE created_at >= now() - interval '7 days') AS a7,
      (SELECT count(*) FROM auth.users WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS new_users`);
  // UN balayage pour les deux listes : comptes par (intention, comprise ?) ; les tops sont dérivés côté serveur.
  const intentRows = await rows<Record<string, unknown>>(sql`
    SELECT coalesce(t.intent, '(aucun)') AS intent, ${UNDERSTOOD} AS understood, count(*) AS n, sum(intent_confidence) AS conf_sum, count(intent_confidence) AS conf_n
    FROM intelligence.agent_turns t WHERE created_at >= ${b.from} AND created_at < ${b.to} GROUP BY 1, 2`);
  const byIntent = new Map<string, { count: number; confSum: number; confN: number }>();
  const misunderstood: { intent: string; n: number }[] = [];
  for (const r of intentRows) {
    const k = String(r.intent);
    const cur = byIntent.get(k) ?? { count: 0, confSum: 0, confN: 0 };
    cur.count += num(r.n); cur.confSum += num(r.conf_sum); cur.confN += num(r.conf_n);
    byIntent.set(k, cur);
    if (!r.understood) misunderstood.push({ intent: k, n: num(r.n) });
  }
  const intents = [...byIntent.entries()].map(([intent, v]) => ({ intent, n: v.count, conf: v.confN ? v.confSum / v.confN : null })).sort((x, y) => y.n - x.n).slice(0, 10);
  misunderstood.sort((x, y) => y.n - x.n);
  const [tools] = await rows<Record<string, unknown>>(sql`
    SELECT count(*) AS calls, count(*) FILTER (WHERE status IN ('SUCCESS','REPLAY')) AS ok, count(*) FILTER (WHERE status IN ('ERROR','DENIED')) AS ko
    FROM intelligence.agent_tool_calls WHERE created_at >= ${b.from} AND created_at < ${b.to}`);
  const [wf] = await rows<Record<string, unknown>>(sql`
    WITH runs AS (
      SELECT conversation_id, workflow, max(completed_at) AS last_at,
             coalesce(bool_or(goal_status = 'COMPLETED'), false) AS done, bool_or(outcome = 'ERROR') AS errored
      FROM intelligence.agent_turns WHERE workflow IS NOT NULL AND created_at >= ${b.from} AND created_at < ${b.to}
      GROUP BY 1, 2)
    SELECT count(*) AS started, count(*) FILTER (WHERE done) AS completed,
           count(*) FILTER (WHERE NOT done AND NOT errored AND last_at < now() - make_interval(mins => ${abandonedMinutes})) AS abandoned
    FROM runs`);
  const [biz] = await rows<Record<string, unknown>>(sql`
    SELECT
      (SELECT count(*) FROM marketplace.products WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS publications,
      (SELECT count(*) FROM marketplace.orders WHERE order_type = 'PREORDER' AND status <> 'DRAFT' AND created_at >= ${b.from} AND created_at < ${b.to}) AS preorders,
      (SELECT count(*) FROM marketplace.orders WHERE status <> 'DRAFT' AND created_at >= ${b.from} AND created_at < ${b.to}) AS orders,
      (SELECT count(*) FROM marketplace.auctions WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS auctions,
      (SELECT count(*) FROM marketplace.bids WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS bids,
      (SELECT count(*) FROM marketplace.payments WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS payments,
      (SELECT count(*) FROM marketplace.deliveries WHERE created_at >= ${b.from} AND created_at < ${b.to}) AS deliveries`);
  // Funnel IMBRIQUÉ (chaque étage est inclus dans le précédent) :
  // message → intention comprise → workflow → outil OK → mutation métier OK → réponse envoyée.
  const [fn] = await rows<Record<string, unknown>>(sql`
    WITH t AS (SELECT id, ${UNDERSTOOD} AS understood, workflow, response_status
               FROM intelligence.agent_turns t WHERE created_at >= ${b.from} AND created_at < ${b.to}),
    tc AS (SELECT turn_id, bool_or(status IN ('SUCCESS','REPLAY')) AS ok,
                  bool_or(status IN ('SUCCESS','REPLAY') AND tool_category = 'WRITE') AS wr
           FROM intelligence.agent_tool_calls WHERE turn_id IN (SELECT id FROM t) GROUP BY 1)
    SELECT count(*) AS s1,
      count(*) FILTER (WHERE understood) AS s2,
      count(*) FILTER (WHERE understood AND workflow IS NOT NULL) AS s3,
      count(*) FILTER (WHERE understood AND workflow IS NOT NULL AND coalesce(tc.ok, false)) AS s4,
      count(*) FILTER (WHERE understood AND workflow IS NOT NULL AND coalesce(tc.ok, false) AND coalesce(tc.wr, false)) AS s5,
      count(*) FILTER (WHERE understood AND workflow IS NOT NULL AND coalesce(tc.ok, false) AND coalesce(tc.wr, false) AND response_status = 'SENT') AS s6
    FROM t LEFT JOIN tc ON tc.turn_id = t.id`);
  const series = await rows<Record<string, unknown>>(sql`
    SELECT date_bin(make_interval(secs => ${p.bucketSeconds}), created_at, ${b.from}) AS bucket,
           count(*) AS turns, count(*) FILTER (WHERE outcome = 'ERROR') AS errors, ${pct('duration_ms', 0.95)} AS p95
    FROM intelligence.agent_turns WHERE created_at >= ${b.from} AND created_at < ${b.to} GROUP BY 1 ORDER BY 1`);

  const turns = num(turnAgg?.turns);
  const stages: [string, string, number][] = [
    ['messages', 'Messages reçus', num(fn?.s1)],
    ['understood', 'Intentions comprises', num(fn?.s2)],
    ['workflow', 'Workflows démarrés', num(fn?.s3)],
    ['tool', 'Outils exécutés', num(fn?.s4)],
    ['mutation', 'Actions métier réussies', num(fn?.s5)],
    ['sent', 'Réponses envoyées', num(fn?.s6)],
  ];
  const funnel: FunnelStage[] = stages.map(([key, label, count], i) => ({
    key,
    label,
    count,
    pctOfTotal: ratio(count, stages[0][2]),
    pctOfPrevious: i === 0 ? null : ratio(count, stages[i - 1][2]),
    lost: i === 0 ? 0 : Math.max(0, stages[i - 1][2] - count),
  }));

  return {
    period: { key: p.key, from: p.from.toISOString(), to: p.to.toISOString() },
    activity: {
      activeUsers24h: num(users?.a24),
      activeUsers7d: num(users?.a7),
      conversations: num(turnAgg?.conversations),
      messagesReceived: turns,
      messagesSent: num(turnAgg?.sent),
      newUsers: num(users?.new_users),
    },
    understanding: {
      recognizedTurns: num(turnAgg?.recognized),
      recognizedRate: ratio(num(turnAgg?.recognized), turns),
      avgConfidence: numOrNull(turnAgg?.avg_conf),
      clarificationRate: ratio(num(turnAgg?.clarif), turns),
      fallbackRate: ratio(num(turnAgg?.fallback), turns),
      topIntents: intents.map((r) => ({ intent: r.intent, count: r.n, avgConfidence: r.conf })),
      notUnderstood: misunderstood.slice(0, 8).map((r) => ({ intent: r.intent, count: r.n })),
    },
    execution: {
      toolCalls: num(tools?.calls),
      toolSuccess: num(tools?.ok),
      toolErrors: num(tools?.ko),
      workflowsStarted: num(wf?.started),
      workflowsCompleted: num(wf?.completed),
      workflowsAbandoned: num(wf?.abandoned),
    },
    business: {
      publications: num(biz?.publications),
      preorders: num(biz?.preorders),
      orders: num(biz?.orders),
      auctions: num(biz?.auctions),
      bids: num(biz?.bids),
      payments: num(biz?.payments),
      deliveries: num(biz?.deliveries),
    },
    performance: {
      p50: at(turnAgg?.pcts, 0),
      p95: at(turnAgg?.pcts, 1),
      p99: at(turnAgg?.pcts, 2),
      previous: { p50: at(prevAgg?.pcts, 0), p95: at(prevAgg?.pcts, 1), p99: at(prevAgg?.pcts, 2) },
    },
    funnel,
    series: series.map((r) => ({ bucket: new Date(String(r.bucket)).toISOString(), turns: num(r.turns), errors: num(r.errors), p95: numOrNull(r.p95) })),
  };
}
