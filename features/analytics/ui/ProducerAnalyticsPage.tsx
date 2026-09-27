'use client';

import React, { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sprout } from 'lucide-react';
import { C, Card, DataState, F } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { HealthBadge } from './BuyerAnalyticsPage';
import { Filters } from './Filters';
import { MetricCardFromPayload } from './MetricCard';
import { TrendPanel } from './TrendPanel';
import { apiParams, parseUrlState, toQuery, type UrlState } from '../range';
import type { FilterOptions, HealthResponse, JourneyResponse } from '../types';
import type { ProducerOverviewResponse, SupplyResponse } from '../types.producer';

const OVERVIEW_KPI: { name: string; label: string }[] = [
  { name: 'active_producers', label: 'Producteurs actifs' },
  { name: 'producer_order_fulfillment_rate', label: 'Taux d’exécution (commandes)' },
  { name: 'producer_quantity_fulfillment_rate', label: 'Taux d’exécution (quantité)' },
  { name: 'producer_delivered_gmv', label: 'GMV livré' },
  { name: 'delivered_gmv_per_active_producer', label: 'GMV livré / producteur actif' },
  { name: 'repeat_producer_rate', label: 'Producteurs récurrents' },
  { name: 'time_to_first_sale', label: 'Délai avant 1re vente' },
];

const TRENDS: { metric: string; title: string }[] = [
  { metric: 'active_producers', title: 'Producteurs actifs' },
  { metric: 'producer_order_fulfillment_rate', title: 'Taux d’exécution (commandes)' },
  { metric: 'producer_quantity_fulfillment_rate', title: 'Taux d’exécution (quantité)' },
  { metric: 'producer_delivered_gmv', title: 'GMV livré' },
];

/** Jauge live (jamais un flux de période) — toujours "aujourd'hui", filtrable par zone/catégorie/sous-catégorie.
 * Réutilise `MetricCardFromPayload` telle quelle : elle gère déjà OK/MIXED_UNITS/UNAVAILABLE/NO_DATA. */
function SupplyGauge({ params }: { params: Record<string, string> }) {
  const { data, error, loading, refetch } = useCockpitData<SupplyResponse>('/api/admin/analytics/producers/supply', params);
  return (
    <Card testId="supply-gauge" title="Approvisionnement disponible" subtitle="Jauge en direct — jamais un flux de période">
      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        {data && <MetricCardFromPayload metric={data.metric} label="Offre disponible" />}
      </DataState>
    </Card>
  );
}

function MetricGrid({ endpoint, params, specs, notesTestId }: { endpoint: string; params: Record<string, string>; specs: { name: string; label: string }[]; notesTestId: string }) {
  const { data, error, loading, refetch } = useCockpitData<JourneyResponse>(endpoint, params);
  return (
    <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {specs.map((s) => {
              const m = data.metrics[s.name];
              return m ? <MetricCardFromPayload key={s.name} metric={m} label={s.label} /> : null;
            })}
          </div>
          {(data.notes ?? []).map((n) => <p key={n} data-testid={notesTestId} style={{ margin: '10px 0 0', fontSize: 12, color: C.muted }}>{n}</p>)}
        </>
      )}
    </DataState>
  );
}

/** Cockpit producteurs : tous les chiffres viennent du Metric Layer backend (`ProducerAnalyticsService`) ; cette page ne calcule aucun KPI.
 * Sell-Through et Demand Exposure restent UNAVAILABLE/PARTIAL — jamais un chiffre fabriqué (voir `not_available`). */
export default function ProducerAnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const state = useMemo(() => parseUrlState(search ?? new URLSearchParams()), [search]);
  const params = useMemo(() => apiParams(state), [state]);

  const update = useCallback((patch: Partial<UrlState>) => {
    const next: UrlState = { ...state, ...patch };
    const q = toQuery(next);
    router.replace(q ? `${pathname}?${q}` : (pathname ?? '/'), { scroll: false });
  }, [state, router, pathname]);

  const overview = useCockpitData<ProducerOverviewResponse>('/api/admin/analytics/producers/overview', params);
  const options = useCockpitData<FilterOptions>('/api/admin/analytics/producers/filters', {});
  const health = useCockpitData<HealthResponse>('/api/admin/analytics/producers/health', {}, { refreshMs: 120_000 });

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 16px 48px', fontFamily: F.body, display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: F.heading, fontSize: 22, fontWeight: 800, color: C.forest, display: 'flex', gap: 10, alignItems: 'center' }}><Sprout size={22} /> Analytics producteurs</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Combien de producteurs actifs, quelle offre disponible, quelle part exécutée et livrée.</p>
          </div>
          {health.data && <HealthBadge health={health.data} />}
        </div>
        <Filters state={state} options={options.data} onChange={update} />
      </header>

      <section aria-label="Indicateurs principaux" data-testid="kpis">
        <DataState loading={overview.loading} error={overview.error} hasData={!!overview.data} onRetry={overview.refetch}>
          {overview.data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {OVERVIEW_KPI.map((k) => {
                const m = overview.data?.metrics[k.name];
                return m ? <MetricCardFromPayload key={k.name} metric={m} label={k.label} /> : null;
              })}
            </div>
          )}
          {overview.data && overview.data.not_available.length > 0 && (
            <details data-testid="not-available" style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Métriques pas encore disponibles ({overview.data.not_available.length})</summary>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {overview.data.not_available.map((n) => <li key={n.metric_name}><b>{n.label}</b> — {n.reason}</li>)}
              </ul>
            </details>
          )}
        </DataState>
      </section>

      <SupplyGauge params={params} />

      <Card testId="fulfillment-section" title="Exécution">
        <MetricGrid endpoint="/api/admin/analytics/producers/fulfillment" params={params}
                    specs={[{ name: 'producer_order_fulfillment_rate', label: 'Commandes' }, { name: 'producer_quantity_fulfillment_rate', label: 'Quantité (DIRECT+RÉCURRENT)' }]}
                    notesTestId="fulfillment-notes" />
      </Card>

      <Card testId="gmv-section" title="GMV">
        <MetricGrid endpoint="/api/admin/analytics/producers/gmv" params={params}
                    specs={[{ name: 'producer_delivered_gmv', label: 'GMV livré' }, { name: 'delivered_gmv_per_active_producer', label: 'GMV / producteur actif' }]}
                    notesTestId="gmv-notes" />
      </Card>

      <Card testId="retention-section" title="Fidélisation">
        <MetricGrid endpoint="/api/admin/analytics/producers/retention" params={params}
                    specs={[{ name: 'repeat_producer_rate', label: 'Producteurs récurrents' }]}
                    notesTestId="retention-notes" />
      </Card>

      <section aria-label="Tendances" data-testid="trends">
        <h2 style={{ fontFamily: F.heading, fontSize: 15, color: C.forest, margin: '0 0 8px' }}>Tendances</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {TRENDS.map((t) => (
            <TrendPanel key={t.metric} metric={t.metric} title={t.title} params={params} endpointBase="/api/admin/analytics/producers" />
          ))}
        </div>
      </section>
    </div>
  );
}
