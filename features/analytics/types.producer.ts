/**
 * Contrat de réponse de l'API analytics producteurs (backend `ProducerAnalyticsService` via
 * `/internal/analytics/producers/*`). Réutilise directement les types génériques de `./types`
 * (MetricPayload, JourneyResponse, TimeseriesResponse, BreakdownResponse, FilterOptions,
 * HealthResponse, Freshness) — le contrat de réponse est identique à celui des acheteurs, seule
 * la forme des deux endpoints qui n'ont pas d'équivalent acheteur (`overview` sans journey_mix,
 * `supply` = une seule métrique live) diffère.
 */
import type { Meta, MetricPayload, NotAvailable, Freshness } from './types';

export interface ProducerOverviewResponse extends Meta {
  metrics: Record<string, MetricPayload>;
  not_available: NotAvailable[];
  freshness: Freshness;
}

/** `available_supply` — jauge LIVE (toujours "aujourd'hui"), jamais un flux de période. */
export interface SupplyResponse extends Meta {
  metric: MetricPayload;
}
