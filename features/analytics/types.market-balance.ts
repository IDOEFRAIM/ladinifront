/**
 * Contrat de réponse de l'API Market Balance (backend `MarketBalanceService` via
 * `/internal/analytics/market-balance/*`). Réutilise `Freshness`/`HealthResponse` de `./types`
 * (mêmes champs) — seules les formes propres à Market Balance sont définies ici : une ligne
 * balance (zone × catégorie × sous-catégorie × unité canonique), et les 3 vues qui la composent
 * (overview par unité, current par ligne, gaps/excess groupés par unité).
 */
import type { Freshness, HealthResponse } from './types';

export type DemandScope = 'RECURRING' | 'TENDER' | 'RECURRING+TENDER';
export type Reliability = 'RELIABLE' | 'PARTIAL' | 'UNAVAILABLE';

export interface BalanceRow {
  zone: string;
  zone_label?: string;
  category: string;
  category_label?: string;
  subcategory: string;
  subcategory_label?: string;
  canonical_unit: string;
  open_demand_quantity: number;
  available_supply_quantity: number;
  potential_coverable_quantity: number;
  potential_coverage_rate: number | null;
  demand_gap_quantity: number;
  excess_supply_quantity: number;
  demand_reliability: Reliability;
  supply_reliability: Reliability;
  reliable_scope: DemandScope;
  as_of: string;
  notes: string[];
}

export interface CurrentBalanceResponse {
  status: 'OK' | 'UNAVAILABLE';
  as_of: string | null;
  rows: BalanceRow[];
  notes?: string[];
  generated_at: string;
}

export interface BalanceUnitTotal {
  canonical_unit: string;
  open_demand_quantity: number;
  available_supply_quantity: number;
  potential_coverable_quantity: number;
  potential_coverage_rate: number | null;
  demand_gap_quantity: number;
  excess_supply_quantity: number;
  reliable_scope: DemandScope[];
}

export interface OverviewResponse {
  status: 'OK' | 'UNAVAILABLE';
  as_of: string | null;
  by_unit: BalanceUnitTotal[];
  notes?: string[];
  generated_at: string;
}

export interface BalanceGroup {
  canonical_unit: string;
  rows: BalanceRow[];
}

export interface GroupedResponse {
  status: 'OK' | 'UNAVAILABLE';
  as_of: string | null;
  groups: BalanceGroup[];
  notes?: string[];
  generated_at: string;
}

export interface TimeseriesPoint {
  snapshot_day: string;
  canonical_unit: string;
  open_demand_quantity: number | null;
  available_supply_quantity: number | null;
  potential_coverable_quantity: number | null;
  potential_coverage_rate: number | null;
  demand_gap_quantity: number | null;
  excess_supply_quantity: number | null;
}

export interface TimeseriesResponse {
  period: { start: string; end: string };
  points: TimeseriesPoint[];
  notes: string[];
  generated_at: string;
}

export type { Freshness, HealthResponse };
