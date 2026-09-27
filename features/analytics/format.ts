import type { MetricPayload, TargetStatus } from './types';

/**
 * Formatage d'AFFICHAGE uniquement. Aucune formule KPI ici : les valeurs, deltas (`delta_points`, `delta_pct`)
 * et statuts viennent du backend. `null` n'est JAMAIS rendu comme 0 : il devient « — ».
 */

const nf = (digits: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const DASH = '—';

export function fmtNumber(n: number | null | undefined, digits = 0): string {
  return n === null || n === undefined || Number.isNaN(n) ? DASH : nf(digits).format(n);
}

export function fmtRatioPct(r: number | null | undefined, digits = 0): string {
  return r === null || r === undefined || Number.isNaN(r) ? DASH : `${nf(digits).format(r * 100)} %`;
}

export function fmtSeconds(s: number | null | undefined): string {
  if (s === null || s === undefined) return DASH;
  if (s < 90) return `${Math.round(s)} s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172800) return `${nf(1).format(s / 3600)} h`;
  return `${nf(1).format(s / 86400)} j`;
}

/** Valeur d'une métrique selon son unité (les ratios s'affichent en %, sauf les ratios de fenêtre non bornés). */
export function fmtValue(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  switch (unit) {
    case 'ratio': return fmtRatioPct(value, 1);
    case 'FCFA': return `${fmtNumber(value)} FCFA`;
    case 'seconds': return fmtSeconds(value);
    case 'orders_per_search': return `${nf(2).format(value)} cmd/recherche`; // peut dépasser 1 : jamais présenté comme un %
    case 'bids': return `${nf(1).format(value)} offres`;
    case 'days': return `${nf(value < 100 ? 1 : 0).format(value)} j`;
    case 'count': case 'buyers': case 'producers': case 'canonical_unit': case undefined: case null: return fmtNumber(value);
    default: return `${fmtNumber(value, value < 100 ? 1 : 0)} ${unit}`;
  }
}

/** Quantité + unité canonique (« 4 200 KG »). Jamais de quantité sans unité. */
export const fmtQuantity = (q: number | null | undefined, unit: string | null | undefined): string =>
  q === null || q === undefined ? DASH : `${fmtNumber(q, q < 100 ? 1 : 0)} ${unit ?? ''}`.trim();

/** Variation vs période précédente : points de pourcentage pour un taux, relatif sinon. */
export function fmtDelta(m: Pick<MetricPayload, 'delta' | 'delta_kind' | 'delta_points' | 'delta_pct'>): string | null {
  if (m.delta === null || m.delta === undefined) return null;
  const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±');
  if (m.delta_kind === 'percentage_points') {
    const pts = m.delta_points ?? m.delta * 100;
    return `${sign(pts)}${nf(1).format(Math.abs(pts))} pts`;
  }
  if (m.delta_pct === null || m.delta_pct === undefined) return null;
  return `${sign(m.delta_pct)}${nf(1).format(Math.abs(m.delta_pct) * 100)} %`;
}

export const TARGET_LABELS: Record<TargetStatus, string> = {
  ON_TARGET: 'Objectif atteint',
  BELOW_TARGET: 'Sous l’objectif',
  WARNING: 'Alerte',
  CRITICAL: 'Critique',
  NO_TARGET: 'Aucun objectif configuré',
};

export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'jamais';
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
