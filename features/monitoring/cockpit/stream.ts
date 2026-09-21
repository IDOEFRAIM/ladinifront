import { sql } from 'drizzle-orm';
import { rows, num } from './db';
import { maskPhone } from './conversations';

export interface LiveTurnEvent {
  id: string;
  conversationId: string;
  at: string;
  maskedPhone: string;
  intent: string | null;
  workflow: string | null;
  outcome: string;
  durationMs: number;
}

export interface LiveSummaryEvent { turns5m: number; activeSessions: number; errors5m: number; completed5m: number }

/**
 * Nouveaux tours depuis `cursor` : UNE requête bornée (index agent_turns_created_idx), ≤ 50 lignes.
 * Le curseur est le `created_at` du dernier tour vu ; un léger recouvrement est dédupliqué côté client par id.
 */
export async function fetchNewTurns(cursor: Date): Promise<{ turns: LiveTurnEvent[]; cursor: Date }> {
  const data = await rows<Record<string, unknown>>(sql`
    SELECT id, conversation_id, created_at, phone_last4, intent, workflow, outcome, duration_ms
    FROM intelligence.agent_turns WHERE created_at > ${cursor.toISOString()}::timestamptz ORDER BY created_at LIMIT 50`);
  const turns = data.map((r) => ({
    id: String(r.id), conversationId: String(r.conversation_id), at: new Date(String(r.created_at)).toISOString(),
    maskedPhone: maskPhone(r.phone_last4 as string | null), intent: (r.intent as string) ?? null, workflow: (r.workflow as string) ?? null,
    outcome: String(r.outcome), durationMs: num(r.duration_ms),
  }));
  return { turns, cursor: turns.length ? new Date(turns[turns.length - 1].at) : cursor };
}

/** Compteurs glissants 5 min : un seul balayage de l'index created_at. */
export async function fetchLiveSummary(): Promise<LiveSummaryEvent> {
  const [r] = await rows<Record<string, unknown>>(sql`
    SELECT count(*) AS turns, count(DISTINCT conversation_id) AS sessions,
           count(*) FILTER (WHERE outcome = 'ERROR') AS errors, count(*) FILTER (WHERE goal_status = 'COMPLETED') AS completed
    FROM intelligence.agent_turns WHERE created_at >= now() - interval '5 minutes'`);
  return { turns5m: num(r?.turns), activeSessions: num(r?.sessions), errors5m: num(r?.errors), completed5m: num(r?.completed) };
}

/** Limite de connexions SSE simultanées (chacune interroge la base toutes les 5 s). */
export const MAX_STREAMS = 5;
let openStreams = 0;
export const acquireStream = (): boolean => (openStreams >= MAX_STREAMS ? false : (openStreams++, true));
export const releaseStream = (): void => { openStreams = Math.max(0, openStreams - 1); };
export const openStreamCount = (): number => openStreams;
