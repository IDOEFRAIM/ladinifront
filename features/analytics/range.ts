/**
 * Période et état d'URL de la page analytics acheteurs.
 *
 * Toutes les dates sont des JOURS CALENDAIRES UTC (bornes incluses), comme dans l'API : « 30 jours » = les 30
 * derniers jours UTC, aujourd'hui inclus. Aucune conversion en heure locale (une date locale décalerait le jour).
 */

export type PeriodKey = '7d' | '30d' | '90d' | 'custom';
export const PERIOD_DAYS: Record<Exclude<PeriodKey, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 };
export const DEFAULT_PERIOD: PeriodKey = '30d';
export const MAX_RANGE_DAYS = 400;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const utcDay = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number): string => utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000));

export interface UrlState {
  period: PeriodKey;
  from: string;
  to: string;
  zone: string;
  category: string;
  sub: string;
  tab: 'direct' | 'tenders' | 'recurring';
}

/** Lit l'état depuis l'URL, en ignorant toute valeur invalide (l'URL est une entrée non fiable). */
export function parseUrlState(params: Pick<URLSearchParams, 'get'>, now: Date = new Date()): UrlState {
  const p = params.get('period');
  const period: PeriodKey = p === '7d' || p === '30d' || p === '90d' || p === 'custom' ? p : DEFAULT_PERIOD;
  const today = utcDay(now);
  let from = params.get('from') ?? '';
  let to = params.get('to') ?? '';
  if (period !== 'custom') {
    to = today;
    from = addDays(today, -(PERIOD_DAYS[period] - 1));
  } else if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to || rangeDays(from, to) > MAX_RANGE_DAYS) {
    to = today;
    from = addDays(today, -(PERIOD_DAYS['30d'] - 1));
  }
  const id = (k: string) => { const v = params.get(k) ?? ''; return UUID_RE.test(v) ? v : ''; };
  const t = params.get('tab');
  return { period, from, to, zone: id('zone'), category: id('category'), sub: id('sub'), tab: t === 'tenders' || t === 'recurring' ? t : 'direct' };
}

export const rangeDays = (from: string, to: string): number => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;

/** Sérialise l'état vers la query-string (valeurs par défaut omises pour garder des URLs courtes). */
export function toQuery(s: UrlState): string {
  const q = new URLSearchParams();
  if (s.period !== DEFAULT_PERIOD) q.set('period', s.period);
  if (s.period === 'custom') { q.set('from', s.from); q.set('to', s.to); }
  if (s.zone) q.set('zone', s.zone);
  if (s.category) q.set('category', s.category);
  if (s.sub) q.set('sub', s.sub);
  if (s.tab !== 'direct') q.set('tab', s.tab);
  return q.toString();
}

/** Paramètres d'API (noms du backend) pour l'état courant. */
export function apiParams(s: UrlState): Record<string, string> {
  const p: Record<string, string> = { from: s.from, to: s.to };
  if (s.zone) p.zone_id = s.zone;
  if (s.category) p.category_id = s.category;
  if (s.sub) p.sub_category_id = s.sub;
  return p;
}
