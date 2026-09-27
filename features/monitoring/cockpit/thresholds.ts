/**
 * Seuils d'état (HEALTHY / DEGRADED / CRITICAL) — configurables via l'environnement :
 *   MONITORING_THRESHOLDS='{"toolErrorRate":{"degraded":0.05,"critical":0.15},"stalledMinutes":15}'  (fusion partielle)
 */
export type HealthState = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export interface Threshold {
  degraded: number;
  critical: number;
}

export interface Thresholds {
  /** part d'appels d'outils en erreur (0..1) */
  toolErrorRate: Threshold;
  /** part d'appels LLM en erreur (0..1) */
  llmErrorRate: Threshold;
  /** latence d'un tour, p95, ms */
  turnP95Ms: Threshold;
  /** SQL cumulé par tour, p95, ms */
  dbP95Ms: Threshold;
  /** Redis cumulé par tour, p95, ms */
  redisP95Ms: Threshold;
  /** envois WhatsApp en échec (0..1) */
  whatsappFailureRate: Threshold;
  /** tours en erreur (0..1) */
  turnErrorRate: Threshold;
  /** workflows en échec (0..1) */
  workflowFailureRate: Threshold;
  /** minutes sans nouveau tour, dans un workflow ouvert, avant STALLED */
  stalledMinutes: number;
  /** minutes d'inactivité avant qu'un workflow non terminé soit considéré abandonné */
  abandonedMinutes: number;
  /** une session est ACTIVE si son dernier tour a moins de N minutes */
  activeMinutes: number;
  /** minutes sans aucun tour au-delà desquelles les workers passent en UNKNOWN */
  workerSilenceMinutes: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  toolErrorRate: { degraded: 0.05, critical: 0.15 },
  llmErrorRate: { degraded: 0.05, critical: 0.2 },
  turnP95Ms: { degraded: 5000, critical: 10000 },
  dbP95Ms: { degraded: 200, critical: 800 },
  redisP95Ms: { degraded: 100, critical: 400 },
  whatsappFailureRate: { degraded: 0.02, critical: 0.1 },
  turnErrorRate: { degraded: 0.05, critical: 0.15 },
  workflowFailureRate: { degraded: 0.1, critical: 0.3 },
  stalledMinutes: 10,
  abandonedMinutes: 30,
  activeMinutes: 5,
  workerSilenceMinutes: 30,
};

export function getThresholds(env: Record<string, string | undefined> = process.env): Thresholds {
  const raw = env.MONITORING_THRESHOLDS;
  if (!raw) return DEFAULT_THRESHOLDS;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...DEFAULT_THRESHOLDS };
    for (const [k, v] of Object.entries(o)) {
      const base = (DEFAULT_THRESHOLDS as unknown as Record<string, unknown>)[k];
      if (base === undefined) continue;
      if (typeof base === 'number' && typeof v === 'number' && v > 0) merged[k] = v;
      else if (typeof base === 'object' && v && typeof v === 'object') merged[k] = { ...(base as object), ...(v as object) };
    }
    return merged as unknown as Thresholds;
  } catch {
    return DEFAULT_THRESHOLDS; // configuration invalide : on garde les défauts, jamais d'erreur d'affichage
  }
}

/** État d'une valeur « plus haut = pire ». Donnée absente → UNKNOWN. */
export function stateOf(value: number | null | undefined, t: Threshold): HealthState {
  if (value === null || value === undefined || Number.isNaN(value)) return 'UNKNOWN';
  if (value >= t.critical) return 'CRITICAL';
  if (value >= t.degraded) return 'DEGRADED';
  return 'HEALTHY';
}

const RANK: Record<HealthState, number> = { UNKNOWN: 0, HEALTHY: 1, DEGRADED: 2, CRITICAL: 3 };
export function worst(states: HealthState[]): HealthState {
  const known = states.filter((s) => s !== 'UNKNOWN');
  if (!known.length) return 'UNKNOWN';
  return known.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}
