/**
 * Contrat de réponse de l'API analytics acheteurs (backend `AnalyticsService` via `/internal/analytics/buyers/*`).
 * Ces types DÉCRIVENT des résultats déjà calculés côté backend : le frontend n'en recalcule aucun KPI.
 */

/** Statut de la DONNÉE d'une métrique sur la période demandée. */
export type DataStatus = 'OK' | 'PARTIAL' | 'UNAVAILABLE' | 'NO_DATA' | 'MIXED_UNITS';
/** Classe de fiabilité de la métrique elle-même. */
export type Reliability = 'RELIABLE' | 'PARTIAL' | 'UNAVAILABLE';
export type TargetStatus = 'ON_TARGET' | 'BELOW_TARGET' | 'WARNING' | 'CRITICAL' | 'NO_TARGET';

export interface BreakdownItem {
  journey?: string;
  canonical_unit?: string;
  numerator: number | null;
  denominator: number | null;
  value: number | null;
  unit?: string;
  reliability?: string;
}

export interface TargetInfo {
  scope_type: string;
  scope_id: string | null;
  value: number;
  warning_threshold: number | null;
  critical_threshold: number | null;
}

export interface MetricPayload {
  metric_name: string;
  label?: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  unit: string | null;
  status: DataStatus;
  reliability: Reliability;
  period: { start: string; end: string };
  target: TargetInfo | null;
  target_status: TargetStatus;
  previous_value: number | null;
  delta: number | null;
  delta_kind: 'percentage_points' | 'relative';
  delta_points?: number;
  delta_pct: number | null;
  breakdown: BreakdownItem[];
  notes: string[];
}

export interface Meta {
  generated_at: string;
  period: { from: string; to: string; timezone: string; inclusive: boolean };
  filters: { zone_id: string | null; category_id: string | null; sub_category_id: string | null; journey: string | null };
  maturity_days: number;
  cache?: 'HIT' | 'MISS';
}

export interface NotAvailable { metric_name: string; label: string; reason: string }

export interface Freshness { last_refresh: string | null; age_seconds: number | null; stale: boolean; stale_after_hours: number; tables: Record<string, string | null> }

export interface OverviewResponse extends Meta {
  metrics: Record<string, MetricPayload>;
  journey_mix: { journey: 'DIRECT' | 'TENDER' | 'RECURRING'; needs: number | null; satisfied: number | null; reliability: string }[];
  not_available: NotAvailable[];
  freshness: Freshness;
}

export interface JourneyResponse extends Meta {
  metrics: Record<string, MetricPayload>;
  notes?: string[];
  not_available?: NotAvailable[];
}

export interface SeriesPoint { bucket: string; canonical_unit?: string; numerator: number | null; denominator: number | null; value: number | null }
export interface TimeseriesResponse extends Meta {
  metric_name: string; granularity: 'day' | 'week' | 'month'; reliability: Reliability; unit: string; physical: boolean;
  points: SeriesPoint[]; notes: string[];
}

export interface BreakdownRow {
  id: string; label: string; category_id?: string | null; category?: string; canonical_unit?: string;
  numerator: number | null; denominator: number | null; value: number | null;
}
export interface BreakdownResponse extends Meta {
  metric_name: string; dimension: string; reliability: Reliability; unit: string; physical: boolean;
  total: number; limit: number; offset: number; rows: BreakdownRow[]; notes: string[];
}

export interface DemandRow {
  sub_category_id: string; sub_category: string; category_id: string | null; category: string;
  zone_id: string; zone: string; canonical_unit: string; measurement_family: string;
  requested: number; matched: number; unmatched: number; coverage: number | null;
  confirmed: number; delivered: number; undelivered_confirmed: number;
}
export interface UnmatchedResponse extends Meta {
  unmatched: { definition: string; total: number; limit: number; offset: number; rows: DemandRow[] };
  undelivered_confirmed: { definition: string; reliability: Reliability; total: number; rows: DemandRow[] };
  totals_by_unit: { canonical_unit: string; requested: number; matched: number; unmatched: number; undelivered_confirmed: number }[];
}

export interface FilterOptions {
  categories: { id: string; name: string }[];
  sub_categories: { id: string; name: string; category_id: string | null }[];
  zones: { id: string; name: string; parent_id: string | null; depth: number }[];
}

export type HealthStatus = 'Healthy' | 'Warning' | 'Stale';
export interface HealthResponse {
  status: HealthStatus; freshness: Freshness; generated_at: string;
  issues: { check: string; table: string; severity: string; count: number; detail: string }[];
}
