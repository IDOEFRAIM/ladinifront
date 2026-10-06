/** Formatage commun aux écrans Recurring (Operations). Aucune logique métier : tout vient du backend. */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function fmtAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—';
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export function fmtQty(value: number | null | undefined, unit?: string): string {
  if (value === null || value === undefined) return '—';
  const n = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
  return unit ? `${n} ${unit}` : n;
}

export const NEED_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Actif', PAUSED: 'En pause', CANCELLED: 'Annulé' };

export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Chaque jour',
  WEEKLY_DAYS: 'Certains jours',
  WEEKLY: 'Chaque semaine',
  MONTHLY: 'Chaque mois',
  ONE_OFF: 'Une seule fois',
};

export const OCCURRENCE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Ouverte',
  SKIPPED: 'Sautée',
  MATCHED: 'Offres trouvées',
  PROPOSED: 'Proposée',
  ACCEPTED: 'Acceptée',
  PARTIALLY_ACCEPTED: 'Partiellement acceptée',
  REJECTED: 'Refusée',
  EXPIRED: 'Expirée',
  FULFILLED: 'Livrée',
  PARTIALLY_FULFILLED: 'Partiellement livrée',
  UNFULFILLED: 'Non livrée',
  CANCELLED: 'Annulée',
};

export const DIAGNOSTIC_LABELS: Record<string, string> = {
  OCCURRENCE_REJECTED: 'Livraison refusée',
  OCCURRENCE_EXPIRED: 'Livraison expirée',
  OCCURRENCE_UNFULFILLED: 'Livraison non honorée',
  ALLOCATION_REJECTED: 'Offre producteur refusée',
  ALLOCATION_EXPIRED: 'Offre producteur expirée',
  ORDER_CANCELLED: 'Commande annulée',
};

export const WEEKDAYS = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function describeFrequency(type: string, weeklyDays: number[] = []): string {
  const base = FREQUENCY_LABELS[type] ?? type;
  if (type === 'WEEKLY_DAYS' && weeklyDays.length) return `${base} (${weeklyDays.map((d) => WEEKDAYS[d] ?? d).join(', ')})`;
  return base;
}

/** « 1 jour » / « 4 jours » — pluriel correct pour le réglage du délai. */
export function fmtDays(n: number): string {
  return `${n} ${n > 1 ? 'jours' : 'jour'}`;
}
