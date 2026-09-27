'use client';

import React, { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { BarList, C, Card, DataState, F } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { fmtAgo } from '../format';
import { apiParams, parseUrlState, toQuery, type UrlState } from '../range';
import type { FilterOptions, HealthResponse, OverviewResponse } from '../types';
import { DemandAnalysis } from './DemandAnalysis';
import { Filters } from './Filters';
import { JourneyTab, TAB_LABELS } from './JourneyTabs';
import { MetricCardFromPayload } from './MetricCard';
import { TrendPanel } from './TrendPanel';
import { UnmatchedDemand } from './UnmatchedDemand';

const KPI: { name: string; label: string }[] = [
  { name: 'active_buyers', label: 'Acheteurs actifs' },
  { name: 'needs_created', label: 'Besoins exprimés' },
  { name: 'successful_procurement_rate', label: 'Besoins satisfaits (North Star)' },
  { name: 'repeat_buyer_rate', label: 'Acheteurs récurrents' },
  { name: 'potential_gmv', label: 'GMV potentiel' },
  { name: 'confirmed_gmv', label: 'GMV confirmé' },
  { name: 'delivered_gmv', label: 'GMV livré' },
];

const TRENDS: { metric: string; title: string }[] = [
  { metric: 'active_buyers', title: 'Acheteurs actifs' },
  { metric: 'needs_created', title: 'Besoins exprimés' },
  { metric: 'successful_procurement_rate', title: 'Besoins satisfaits' },
  { metric: 'confirmed_gmv', title: 'GMV confirmé' },
  { metric: 'recurring_coverage_rate', title: 'Couverture récurrente' },
  { metric: 'tender_response_rate', title: 'Taux de réponse des appels d’offres' },
  { metric: 'direct_search_success_rate', title: 'Réussite des recherches directes' },
];

const HEALTH_STYLE = {
  Healthy: { fg: '#047857', bg: 'rgba(16,185,129,0.12)', label: 'Données saines' },
  Warning: { fg: '#B45309', bg: 'rgba(217,119,6,0.16)', label: 'Avertissement' },
  Stale: { fg: '#B91C1C', bg: 'rgba(220,38,38,0.12)', label: 'PÉRIMÉES' },
} as const;

export function HealthBadge({ health }: { health: HealthResponse }) {
  const s = HEALTH_STYLE[health.status];
  return (
    <div data-testid="analytics-health" data-status={health.status} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
      <span style={{ background: s.bg, color: s.fg, fontWeight: 800, borderRadius: 100, padding: '3px 10px', letterSpacing: '0.04em' }}>Analytics : {s.label}</span>
      <span data-testid="last-refresh">Mis à jour {fmtAgo(health.freshness.last_refresh)}</span>
      {health.status === 'Stale' && <b style={{ color: s.fg }}>Les chiffres affichés peuvent être périmés (plus de {health.freshness.stale_after_hours} h sans recalcul).</b>}
      {health.issues.length > 0 && (
        <details><summary style={{ cursor: 'pointer' }}>{health.issues.length} point(s) de qualité</summary>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{health.issues.map((i) => <li key={`${i.check}-${i.table}`}>{i.check} — {i.detail} ({i.count})</li>)}</ul>
        </details>
      )}
    </div>
  );
}

/** Cockpit acheteurs : tous les chiffres viennent du Metric Layer backend ; cette page ne calcule aucun KPI. */
export default function BuyerAnalyticsPage() {
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

  const overview = useCockpitData<OverviewResponse>('/api/admin/analytics/buyers/overview', params);
  const options = useCockpitData<FilterOptions>('/api/admin/analytics/buyers/filters', {});
  const health = useCockpitData<HealthResponse>('/api/admin/analytics/buyers/health', {}, { refreshMs: 120_000 });

  const mix = overview.data?.journey_mix ?? [];
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 16px 48px', fontFamily: F.body, display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: F.heading, fontSize: 22, fontWeight: 800, color: C.forest, display: 'flex', gap: 10, alignItems: 'center' }}><BarChart3 size={22} /> Analytics acheteurs</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Combien d&apos;acheteurs, quels besoins, quelle part satisfaite, où l&apos;offre manque.</p>
          </div>
          {health.data && <HealthBadge health={health.data} />}
        </div>
        <Filters state={state} options={options.data} onChange={update} />
      </header>

      <section aria-label="Indicateurs principaux" data-testid="kpis">
        <DataState loading={overview.loading} error={overview.error} hasData={!!overview.data} onRetry={overview.refetch}>
          {overview.data && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
              {KPI.map((k) => {
                const m = overview.data?.metrics[k.name];
                return m ? <MetricCardFromPayload key={k.name} metric={m} label={k.label} /> : null;
              })}
            </div>
          )}
        </DataState>
      </section>

      {mix.length > 0 && (
        <Card testId="journey-mix" title="Répartition des besoins par parcours" subtitle="Besoins exprimés (satisfaits entre parenthèses)">
          <BarList items={mix.map((m) => ({ label: TAB_LABELS[m.journey === 'DIRECT' ? 'direct' : m.journey === 'TENDER' ? 'tenders' : 'recurring'], value: m.needs ?? 0, sub: `${m.satisfied ?? 0} satisfaits` }))} />
        </Card>
      )}

      <section aria-label="Parcours">
        <nav role="tablist" aria-label="Parcours d'achat" style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
          {(Object.keys(TAB_LABELS) as (keyof typeof TAB_LABELS)[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={state.tab === t} onClick={() => update({ tab: t })}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '9px 16px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', color: state.tab === t ? C.forest : C.muted, borderBottom: `3px solid ${state.tab === t ? C.emerald : 'transparent'}` }}>{TAB_LABELS[t]}</button>
          ))}
        </nav>
        <JourneyTab tab={state.tab} params={params} />
      </section>

      <section aria-label="Tendances" data-testid="trends">
        <h2 style={{ fontFamily: F.heading, fontSize: 15, color: C.forest, margin: '0 0 8px' }}>Tendances</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {TRENDS.map((t) => <TrendPanel key={t.metric} metric={t.metric} title={t.title} params={params} />)}
        </div>
      </section>

      <DemandAnalysis params={params} />
      <UnmatchedDemand params={params} />
    </div>
  );
}
