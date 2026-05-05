/**
 * DISTRIBUTION STATE MACHINE — Source unique de verite pour le cycle de distribution de semences
 *
 * Statuts :
 *   PENDING     - Distribution initialisee, code OTP envoye, en attente de confirmation
 *   COMPLETED   - Code verifie, stock decremente, distribution reussie
 *   FAILED      - Echec (code expire, tentatives max depassees, stock insuffisant)
 *   CANCELLED   - Annulee manuellement par un admin/agent
 */

export const DISTRIBUTION_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

export type DistributionStatus = (typeof DISTRIBUTION_STATUSES)[number];

const TRANSITIONS: Record<DistributionStatus, readonly DistributionStatus[]> = {
  PENDING:   ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED:    [],
  CANCELLED: [],
};

export const DIST_STATUS_LABELS: Record<DistributionStatus, string> = {
  PENDING:   'En attente',
  COMPLETED: 'Completee',
  FAILED:    'Echouee',
  CANCELLED: 'Annulee',
};

export const DIST_STATUS_COLORS: Record<DistributionStatus, string> = {
  PENDING:   '#D97706',
  COMPLETED: '#059669',
  FAILED:    '#DC2626',
  CANCELLED: '#64748B',
};

export const DIST_STATUS_BADGE: Record<DistributionStatus, { bg: string; text: string }> = {
  PENDING:   { bg: 'bg-amber-100',   text: 'text-amber-800' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  FAILED:    { bg: 'bg-red-100',     text: 'text-red-800' },
  CANCELLED: { bg: 'bg-stone-100',   text: 'text-stone-600' },
};

// ── Guards ──────────────────────────────────────────────────────────────

export function canTransitionDist(from: string, to: string): boolean {
  const f = from.toUpperCase() as DistributionStatus;
  const t = to.toUpperCase() as DistributionStatus;
  if (!TRANSITIONS[f]) return false;
  return TRANSITIONS[f].includes(t);
}

export function assertDistTransition(from: string, to: string): DistributionStatus {
  const f = from.toUpperCase() as DistributionStatus;
  const t = to.toUpperCase() as DistributionStatus;
  if (!DISTRIBUTION_STATUSES.includes(f)) throw new Error(`Statut source inconnu : ${from}`);
  if (!DISTRIBUTION_STATUSES.includes(t)) throw new Error(`Statut cible inconnu : ${to}`);
  if (!canTransitionDist(f, t)) {
    throw new Error(`Transition invalide : ${DIST_STATUS_LABELS[f]} -> ${DIST_STATUS_LABELS[t]}`);
  }
  return t;
}

export function isTerminalStatus(status: string): boolean {
  const s = status.toUpperCase() as DistributionStatus;
  return s === 'COMPLETED' || s === 'FAILED' || s === 'CANCELLED';
}

export function isCancellable(status: string): boolean {
  return status.toUpperCase() === 'PENDING';
}
