/**
 * Analytics Phase B — TS contract only. No dashboard, no chart, no API
 * client here (mission: "pas de graphiques complets dans cette phase").
 *
 * Mirrors the Python buyer metric dictionary
 * (backend/src/ladini/domain/analytics/metric_dictionary.py) — this file
 * must be kept in sync with that one by NAME. The metric names below are
 * NOT re-derived here; they are the same 32 catalogue entries, so a
 * frontend chart component can eventually import `MetricName` and get
 * autocomplete/type-safety against the exact same dictionary the backend
 * computes from, instead of a hand-typed string.
 *
 * See docs/analytics/BUYER_ANALYTICS_ARCHITECTURE.md (backend repo) for the
 * full rationale behind every definition below.
 */

export type Journey = 'GLOBAL' | 'DIRECT' | 'TENDER' | 'RECURRING';

export type AggregationType =
  | 'COUNT'
  | 'SUM'
  | 'WEIGHTED_RATIO'
  | 'DURATION_AVG'
  | 'GAUGE';

export type Reconstructibility = 'YES' | 'PARTIAL' | 'NO';

/** Same fixed vocabulary as the Python dictionary's `supported_dimensions` —
 * never a raw product name (mission: "pas de hardcode produit"). */
export type MetricDimension =
  | 'date'
  | 'zone'
  | 'category'
  | 'sub_category'
  | 'journey'
  | 'buyer';

export type TimeWindow = 'DAY' | 'WEEK' | 'MONTH' | 'CUSTOM_RANGE' | 'ROLLING_90D' | 'POINT_IN_TIME';

/** The 32 canonical metric names — kept in exact sync with
 * `metric_dictionary.py::METRICS`'s keys. */
export type MetricName =
  // GLOBAL
  | 'active_buyers'
  | 'needs_created'
  | 'successful_procurement_rate'
  | 'fulfillment_rate'
  | 'repeat_buyer_rate'
  | 'potential_gmv'
  | 'confirmed_gmv'
  | 'delivered_gmv'
  // DIRECT
  | 'direct_searches'
  | 'direct_search_success_rate'
  | 'direct_search_to_order_rate'
  | 'direct_fulfillment_rate'
  | 'direct_gmv'
  // TENDER
  | 'tenders_created'
  | 'tender_response_rate'
  | 'average_bids_per_tender'
  | 'time_to_first_bid'
  | 'tender_winner_rate'
  | 'tender_fulfillment_rate'
  | 'tender_gmv'
  // RECURRING
  | 'active_recurring_needs'
  | 'recurring_requested_quantity'
  | 'recurring_matched_quantity'
  | 'recurring_confirmed_quantity'
  | 'recurring_delivered_quantity'
  | 'recurring_coverage_rate'
  | 'recurring_full_coverage_rate'
  | 'recurring_acceptance_rate'
  | 'recurring_modification_rate'
  | 'recurring_skip_rate'
  | 'recurring_fulfillment_rate'
  | 'recurring_gmv';

/**
 * Common filter shape every future `/api/admin/analytics/*` endpoint should
 * accept — the mission's own filter list (from/to/zone/category/
 * sub_category/journey), nothing endpoint-specific mixed in.
 */
export interface AnalyticsCommonFilters {
  from: string; // ISO date
  to: string; // ISO date
  zoneId?: string;
  categoryId?: string;
  subCategoryId?: string;
  journey?: Journey;
}

/**
 * The response shape every metric-reading endpoint should return — the
 * frontend never recomputes value/delta itself (mission: "le frontend ne
 * doit PAS recalculer les KPI").
 */
export interface MetricValueResponse {
  metricName: MetricName;
  value: number | null; // null when the denominator is 0 (undefined rate) — never coerced to 0
  numerator: number | null;
  denominator: number | null;
  unit?: string; // present only for quantity/currency metrics, absent for pure ratios/counts
  target?: number | null;
  previousPeriodValue?: number | null;
  delta?: number | null;
  reconstructibleHistorically: Reconstructibility;
}

export interface MetricTimeseriesPoint {
  date: string; // ISO date, start of the bucket
  value: number | null;
  numerator: number | null;
  denominator: number | null;
}

export interface MetricTimeseriesResponse {
  metricName: MetricName;
  window: TimeWindow;
  points: MetricTimeseriesPoint[];
}

export interface MetricBreakdownRow {
  dimension: MetricDimension;
  dimensionValue: string; // an id (zone/category/sub_category) or a journey name — never a product name
  label: string; // admin-facing display label, resolved server-side
  value: number | null;
  numerator: number | null;
  denominator: number | null;
}

export interface MetricBreakdownResponse {
  metricName: MetricName;
  dimension: MetricDimension;
  rows: MetricBreakdownRow[];
}

/** Row shape mirroring `metric_targets.py::MetricTarget` — for a future
 * admin "manage targets" screen, not built in this phase. */
export type TargetScopeType = 'GLOBAL' | 'JOURNEY' | 'CATEGORY' | 'SUBCATEGORY' | 'ZONE';

export interface MetricTarget {
  metricName: MetricName;
  scopeType: TargetScopeType;
  scopeId: string | null;
  targetValue: number;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  validFrom: string; // ISO date
  validUntil: string | null;
}
