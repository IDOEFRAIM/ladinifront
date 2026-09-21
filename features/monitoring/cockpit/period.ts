/** Période globale du cockpit : 1h | 24h | 7d | 30d | custom (from/to ISO). Fournit aussi la période précédente (comparaison). */

export type PeriodKey = '1h' | '24h' | '7d' | '30d' | 'custom';

export interface Period {
  key: PeriodKey;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  /** Pas des séries temporelles (secondes). */
  bucketSeconds: number;
}

export class BadPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadPeriodError';
  }
}

const MS = { h: 3_600_000, d: 86_400_000 };
const PRESETS: Record<Exclude<PeriodKey, 'custom'>, { ms: number; bucket: number }> = {
  '1h': { ms: MS.h, bucket: 300 },
  '24h': { ms: 24 * MS.h, bucket: 3600 },
  '7d': { ms: 7 * MS.d, bucket: 6 * 3600 },
  '30d': { ms: 30 * MS.d, bucket: 86400 },
};
export const MAX_CUSTOM_RANGE_MS = 90 * MS.d;
export const CLOCK_SKEW_TOLERANCE_MS = 60_000;

type Params = Pick<URLSearchParams, 'get'>;

export function resolvePeriod(params: Params, now: Date = new Date()): Period {
  const key = (params.get('period') || '24h') as PeriodKey;
  if (key === 'custom') {
    const from = new Date(params.get('from') || '');
    const to = new Date(params.get('to') || '');
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadPeriodError('from/to invalides (ISO 8601 requis pour period=custom)');
    if (to <= from) throw new BadPeriodError('to doit être postérieur à from');
    const span = to.getTime() - from.getTime();
    if (span > MAX_CUSTOM_RANGE_MS) throw new BadPeriodError('période personnalisée limitée à 90 jours');
    const bucketSeconds = span <= 2 * MS.h ? 300 : span <= 2 * MS.d ? 3600 : span <= 14 * MS.d ? 6 * 3600 : 86400;
    return { key, from, to, prevFrom: new Date(from.getTime() - span), prevTo: from, bucketSeconds };
  }
  const preset = PRESETS[key as Exclude<PeriodKey, 'custom'>];
  if (!preset) throw new BadPeriodError(`period inconnue « ${key} » (1h, 24h, 7d, 30d, custom)`);
  // `to` = maintenant + tolérance : les lignes sont horodatées par la base (now()) ou par les workers, dont l'horloge peut
  // avancer de quelques ms/secondes sur celle du serveur Next — sans marge, les toutes dernières lignes disparaîtraient.
  const to = new Date(now.getTime() + CLOCK_SKEW_TOLERANCE_MS);
  const from = new Date(now.getTime() - preset.ms);
  return { key, from, to, prevFrom: new Date(from.getTime() - preset.ms), prevTo: from, bucketSeconds: preset.bucket };
}

/** Pagination par offset, bornée. */
export function resolvePage(params: Params, defaults = { limit: 25, max: 100 }) {
  const limit = Math.min(Math.max(parseInt(params.get('limit') || '', 10) || defaults.limit, 1), defaults.max);
  const offset = Math.max(parseInt(params.get('offset') || '', 10) || 0, 0);
  return { limit, offset };
}
