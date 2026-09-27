'use client';

import React, { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { C, Card, DataState, F } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { HealthBadge } from './BuyerAnalyticsPage';
import { ReliabilityBadge } from './MetricCard';
import { DASH, fmtQuantity, fmtRatioPct } from '../format';
import type { FilterOptions, HealthResponse } from '../types';
import type {
  BalanceRow, CurrentBalanceResponse, GroupedResponse, OverviewResponse,
} from '../types.market-balance';

const sel: React.CSSProperties = { padding: '6px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, background: '#fff', maxWidth: 220 };

interface FilterState {
  zone: string;
  category: string;
  sub: string;
}

function useFilterParams(state: FilterState): Record<string, string> {
  return useMemo(() => {
    const p: Record<string, string> = {};
    if (state.zone) p.zone_scope = state.zone;
    if (state.category) p.category_id = state.category;
    if (state.sub) p.sub_category_id = state.sub;
    return p;
  }, [state.zone, state.category, state.sub]);
}

function FilterBar({ state, options, onChange }: { state: FilterState; options: FilterOptions | null; onChange: (patch: Partial<FilterState>) => void }) {
  const subs = (options?.sub_categories ?? []).filter((s) => !state.category || s.category_id === state.category);
  return (
    <div data-testid="mb-filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <select aria-label="Zone" value={state.zone} onChange={(e) => onChange({ zone: e.target.value })} style={sel}>
        <option value="">Toutes les zones</option>
        {(options?.zones ?? []).map((z) => <option key={z.id} value={z.id}>{`${'— '.repeat(Math.min(z.depth, 4))}${z.name}`}</option>)}
      </select>
      <select aria-label="Catégorie" value={state.category} onChange={(e) => onChange({ category: e.target.value, sub: '' })} style={sel}>
        <option value="">Toutes les catégories</option>
        {(options?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select aria-label="Sous-catégorie" value={state.sub} onChange={(e) => onChange({ sub: e.target.value })} style={sel}>
        <option value="">Toutes les sous-catégories</option>
        {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <span style={{ fontSize: 11, color: C.muted }}>Instantané en direct — jamais un flux de période</span>
    </div>
  );
}

function ScopeBadges({ scopes }: { scopes: string[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {scopes.map((s) => (
        <span key={s} style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 100, background: 'rgba(6,78,59,0.06)', color: C.muted }}>{s}</span>
      ))}
    </span>
  );
}

function OverviewCards({ params }: { params: Record<string, string> }) {
  const { data, error, loading, refetch } = useCockpitData<OverviewResponse>('/api/admin/analytics/market-balance/overview', params);
  return (
    <section aria-label="Vue d'ensemble" data-testid="mb-overview">
      <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.status === 'OK' && data.by_unit.length === 0}
                 emptyText="Aucune activité observable (ni demande ni offre)." onRetry={refetch}>
        {data && data.status === 'UNAVAILABLE' && (
          <div data-testid="mb-overview-unavailable" style={{ fontSize: 13, color: C.muted }}>{data.notes?.[0] ?? 'Donnée indisponible'}</div>
        )}
        {data && data.status === 'OK' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {data.by_unit.map((u) => (
              <article key={u.canonical_unit} data-testid={`mb-unit-${u.canonical_unit}`} style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', display: 'grid', gap: 6 }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>{u.canonical_unit}</span>
                  <ScopeBadges scopes={u.reliable_scope} />
                </header>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                  <div><span style={{ color: C.muted }}>Demande ouverte</span><div data-testid="mb-open-demand" style={{ fontWeight: 800 }}>{fmtQuantity(u.open_demand_quantity, u.canonical_unit)}</div></div>
                  <div><span style={{ color: C.muted }}>Offre disponible</span><div style={{ fontWeight: 800 }}>{fmtQuantity(u.available_supply_quantity, u.canonical_unit)}</div></div>
                  <div><span style={{ color: C.muted }}>Couverture potentielle</span><div style={{ fontWeight: 800 }}>{fmtRatioPct(u.potential_coverage_rate, 0)}</div></div>
                  <div><span style={{ color: C.muted }}>Écart de demande</span><div style={{ fontWeight: 800, color: u.demand_gap_quantity > 0 ? '#B45309' : C.text }}>{fmtQuantity(u.demand_gap_quantity, u.canonical_unit)}</div></div>
                  <div><span style={{ color: C.muted }}>Surplus d’offre</span><div style={{ fontWeight: 800 }}>{fmtQuantity(u.excess_supply_quantity, u.canonical_unit)}</div></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </DataState>
    </section>
  );
}

function GroupedTable({ title, testId, endpoint, params, column, emptyText, signal }: {
  title: string; testId: string; endpoint: string; params: Record<string, string>; column: 'demand_gap_quantity' | 'excess_supply_quantity'; emptyText: string; signal: string;
}) {
  const { data, error, loading, refetch } = useCockpitData<GroupedResponse>(endpoint, params);
  const hasRows = !!data && data.status === 'OK' && data.groups.some((g) => g.rows.length > 0);
  return (
    <Card testId={testId} title={title} subtitle={signal}>
      <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.status === 'OK' && !hasRows} emptyText={emptyText} onRetry={refetch}>
        {data && data.status === 'OK' && hasRows && data.groups.map((g) => (
          <div key={g.canonical_unit} style={{ marginBottom: 14 }}>
            <h4 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{g.canonical_unit}</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.muted }}>
                  <th style={{ padding: '4px 6px' }}>Zone</th><th>Sous-catégorie</th><th>Quantité</th><th>Couverture</th><th>Périmètre</th><th>Fiabilité</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, i) => (
                  <tr key={`${r.zone}-${r.subcategory}-${i}`} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '4px 6px' }}>{r.zone_label ?? r.zone}</td>
                    <td>{r.subcategory_label ?? r.subcategory}</td>
                    <td style={{ fontWeight: 800 }}>{fmtQuantity(r[column], r.canonical_unit)}</td>
                    <td>{fmtRatioPct(r.potential_coverage_rate, 0)}</td>
                    <td><ScopeBadges scopes={[r.reliable_scope]} /></td>
                    <td>{r.demand_reliability !== 'RELIABLE' ? <ReliabilityBadge reliability={r.demand_reliability} title={r.notes?.[0]} /> : DASH}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </DataState>
    </Card>
  );
}

function MainMatrix({ params }: { params: Record<string, string> }) {
  const { data, error, loading, refetch } = useCockpitData<CurrentBalanceResponse>('/api/admin/analytics/market-balance/current', params);
  return (
    <Card testId="mb-matrix" title="Matrice de pilotage">
      <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.status === 'OK' && data.rows.length === 0}
                 emptyText="Aucune ligne pour ces filtres." onRetry={refetch}>
        {data && data.status === 'OK' && data.rows.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: C.muted }}>
                  <th style={{ padding: '4px 6px' }}>Zone</th><th>Catégorie</th><th>Sous-catégorie</th><th>Unité</th>
                  <th>Demande</th><th>Offre</th><th>Couverture</th><th>Écart</th><th>Surplus</th><th>Fiabilité</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: BalanceRow, i) => (
                  <tr key={`${r.zone}-${r.subcategory}-${r.canonical_unit}-${i}`} data-testid="mb-matrix-row" style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '4px 6px' }}>{r.zone_label ?? r.zone}</td>
                    <td>{r.category_label ?? r.category}</td>
                    <td>{r.subcategory_label ?? r.subcategory}</td>
                    <td>{r.canonical_unit}</td>
                    <td>{fmtQuantity(r.open_demand_quantity, r.canonical_unit)}</td>
                    <td>{fmtQuantity(r.available_supply_quantity, r.canonical_unit)}</td>
                    <td>{fmtRatioPct(r.potential_coverage_rate, 0)}</td>
                    <td style={{ color: r.demand_gap_quantity > 0 ? '#B45309' : C.text }}>{fmtQuantity(r.demand_gap_quantity, r.canonical_unit)}</td>
                    <td>{fmtQuantity(r.excess_supply_quantity, r.canonical_unit)}</td>
                    <td>
                      {r.demand_reliability !== 'RELIABLE' ? <ReliabilityBadge reliability={r.demand_reliability} title={r.notes?.[0]} /> : DASH}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </Card>
  );
}

/** Cockpit Market Balance : met en regard la demande ouverte (RECURRING fiable, TENDER PARTIAL) et
 * l'offre disponible (jauge live). Aucun score arbitraire — uniquement des quantités et des faits
 * (docs/analytics/MARKET_BALANCE.md). DIRECT reste hors périmètre quantitatif (aucune quantité
 * persistée n'existe pour ce parcours) — voir la note de périmètre en pied de page. */
export default function MarketBalancePage() {
  const [state, setState] = useState<FilterState>({ zone: '', category: '', sub: '' });
  const update = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));
  const params = useFilterParams(state);

  const options = useCockpitData<FilterOptions>('/api/admin/analytics/market-balance/filters', {});
  const health = useCockpitData<HealthResponse>('/api/admin/analytics/market-balance/health', {}, { refreshMs: 120_000 });

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 16px 48px', fontFamily: F.body, display: 'grid', gap: 18 }}>
      <header style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: F.heading, fontSize: 22, fontWeight: 800, color: C.forest, display: 'flex', gap: 10, alignItems: 'center' }}><Scale size={22} /> Market Balance</h1>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>Demande ouverte (RECURRING + TENDER) face à l’offre disponible, par zone / catégorie / sous-catégorie / unité.</p>
          </div>
          {health.data && <HealthBadge health={health.data} />}
        </div>
        <FilterBar state={state} options={options.data} onChange={update} />
      </header>

      <OverviewCards params={params} />

      <GroupedTable title="Écarts de demande" testId="mb-demand-gaps" endpoint="/api/admin/analytics/market-balance/demand-gaps"
                    params={params} column="demand_gap_quantity" emptyText="Aucun écart de demande observable."
                    signal="Signal de sourcing : où l’offre manque face à une demande ouverte." />

      <GroupedTable title="Surplus d’offre" testId="mb-excess-supply" endpoint="/api/admin/analytics/market-balance/excess-supply"
                    params={params} column="excess_supply_quantity" emptyText="Aucun surplus d’offre observable."
                    signal="Signal d’acquisition : où l’offre existe sans demande ouverte observée." />

      <MainMatrix params={params} />

      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
        DIRECT reste hors périmètre quantitatif : aucune quantité de besoin n’est persistée avant la commande elle-même
        (voir docs/analytics/MARKET_BALANCE.md). TENDER est inclus mais marqué PARTIAL : une enchère annulée après attribution
        ne réapparaît pas comme demande ouverte.
      </p>
    </div>
  );
}
