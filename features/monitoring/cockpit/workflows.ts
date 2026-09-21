import { sql } from 'drizzle-orm';
import { rows, bounds, num, numOrNull, ratio } from './db';
import type { Period } from './period';
import type { Thresholds } from './thresholds';

export interface WorkflowRow {
  workflow: string;
  started: number;
  completed: number;
  abandoned: number;
  errors: number;
  inProgress: number;
  successRate: number | null;
  medianSeconds: number | null;
  p95Seconds: number | null;
}

/**
 * Un « workflow » = un but de l'agent (`current_goal`) mené dans une session : couple (session, but).
 * started = couples vus dans la période ; completed = un tour a fermé le but ; errors = un tour en erreur (et non terminé) ;
 * abandoned = ni terminé, ni en erreur, sans activité depuis `abandonedMinutes` ; inProgress = le reste.
 * Durées : première → dernière activité des workflows TERMINÉS.
 */
export async function fetchWorkflows(p: Period, th: Thresholds): Promise<WorkflowRow[]> {
  const b = bounds(p);
  const data = await rows<Record<string, unknown>>(sql`
    WITH runs AS (
      SELECT conversation_id, workflow, min(started_at) AS first_at, max(completed_at) AS last_at,
             coalesce(bool_or(goal_status = 'COMPLETED'), false) AS done, bool_or(outcome = 'ERROR') AS errored
      FROM intelligence.agent_turns WHERE workflow IS NOT NULL AND created_at >= ${b.from} AND created_at < ${b.to}
      GROUP BY 1, 2)
    SELECT workflow, count(*) AS started,
      count(*) FILTER (WHERE done) AS completed,
      count(*) FILTER (WHERE errored AND NOT done) AS errors,
      count(*) FILTER (WHERE NOT done AND NOT errored AND last_at < now() - make_interval(mins => ${th.abandonedMinutes})) AS abandoned,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (last_at - first_at))) FILTER (WHERE done) AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM (last_at - first_at))) FILTER (WHERE done) AS p95
    FROM runs GROUP BY workflow ORDER BY started DESC`);
  return data.map((r) => {
    const started = num(r.started), completed = num(r.completed), errors = num(r.errors), abandoned = num(r.abandoned);
    return {
      workflow: String(r.workflow), started, completed, abandoned, errors,
      inProgress: Math.max(0, started - completed - errors - abandoned),
      successRate: ratio(completed, started), medianSeconds: numOrNull(r.p50), p95Seconds: numOrNull(r.p95),
    };
  });
}

export interface WorkflowStep {
  step: string;
  reached: number;
  /** % des sessions ayant démarré ce workflow */
  pct: number | null;
}

/** Funnel interne : combien de sessions atteignent chaque étape (`pending_interaction.kind`), dans l'ordre moyen d'apparition. */
export async function fetchWorkflowSteps(p: Period, workflow: string): Promise<{ workflow: string; total: number; steps: WorkflowStep[] }> {
  const b = bounds(p);
  const [tot] = await rows<Record<string, unknown>>(sql`
    SELECT count(DISTINCT conversation_id) AS n FROM intelligence.agent_turns
    WHERE workflow = ${workflow} AND created_at >= ${b.from} AND created_at < ${b.to}`);
  const steps = await rows<Record<string, unknown>>(sql`
    WITH t AS (
      SELECT conversation_id, workflow_step, row_number() OVER (PARTITION BY conversation_id ORDER BY started_at) AS rn
      FROM intelligence.agent_turns
      WHERE workflow = ${workflow} AND workflow_step IS NOT NULL AND created_at >= ${b.from} AND created_at < ${b.to})
    SELECT workflow_step AS step, count(DISTINCT conversation_id) AS reached, avg(rn) AS pos
    FROM t GROUP BY 1 ORDER BY pos, reached DESC`);
  const total = num(tot?.n);
  return { workflow, total, steps: steps.map((s) => ({ step: String(s.step), reached: num(s.reached), pct: ratio(num(s.reached), total) })) };
}
