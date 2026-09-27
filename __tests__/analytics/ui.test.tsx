// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Pass, LineChart: Pass, Line: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null };
});
const replace = vi.fn();
let currentSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/admin/analytics/buyers',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import { MetricCard, MetricCardFromPayload } from '@/features/analytics/ui/MetricCard';
import { Filters } from '@/features/analytics/ui/Filters';
import { UnmatchedDemand } from '@/features/analytics/ui/UnmatchedDemand';
import { DemandAnalysis } from '@/features/analytics/ui/DemandAnalysis';
import { JourneyTab } from '@/features/analytics/ui/JourneyTabs';
import BuyerAnalyticsPage, { HealthBadge } from '@/features/analytics/ui/BuyerAnalyticsPage';
import { pivotSeries } from '@/features/analytics/ui/TrendPanel';
import { parseUrlState } from '@/features/analytics/range';
import type { HealthResponse, MetricPayload } from '@/features/analytics/types';

const ZONE = '11111111-1111-4111-8111-111111111111';
const CAT = '22222222-2222-4222-8222-222222222222';

function metric(over: Partial<MetricPayload> = {}): MetricPayload {
  return {
    metric_name: 'recurring_coverage_rate', label: 'Couverture', value: 0.69, numerator: 4310, denominator: 6240, unit: 'ratio',
    status: 'OK', reliability: 'RELIABLE', period: { start: 'a', end: 'b' }, target: null, target_status: 'NO_TARGET',
    previous_value: 0.61, delta: 0.08, delta_kind: 'percentage_points', delta_points: 8, delta_pct: null, breakdown: [], notes: [], ...over,
  };
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); replace.mockReset(); currentSearch = ''; });

describe('MetricCard', () => {
  it('métrique fiable : valeur, comparaison en points, pas de badge de fiabilité', () => {
    render(<MetricCardFromPayload metric={metric()} label="Couverture" />);
    expect(screen.getByTestId('metric-value')).toHaveTextContent('69');
    expect(screen.getByTestId('metric-delta')).toHaveTextContent('+8 pts');
    expect(screen.getByTestId('metric-previous')).toHaveTextContent('61');
    expect(screen.queryByTestId('reliability-PARTIAL')).toBeNull();
  });

  it('PARTIAL : le chiffre reste affiché avec un badge visible et des détails au clic', () => {
    render(<MetricCardFromPayload metric={metric({ metric_name: 'successful_procurement_rate', value: 0.58, reliability: 'PARTIAL', status: 'PARTIAL',
      notes: ['Reliable scope: DIRECT + TENDER. Recurring depends on buyer-confirmed RECEIVED orders.'],
      breakdown: [{ journey: 'DIRECT+TENDER (reliable_scope)', numerator: 8, denominator: 15, value: 0.53, reliability: 'RELIABLE' }] })} label="Besoins satisfaits" />);
    expect(screen.getByTestId('metric-value')).toHaveTextContent('58');
    expect(screen.getByTestId('reliability-PARTIAL')).toBeInTheDocument();
    expect(screen.queryByTestId('metric-details')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Détails de la métrique/ }));
    expect(screen.getByTestId('metric-details')).toHaveTextContent('Reliable scope: DIRECT + TENDER');
    expect(screen.getByTestId('metric-details')).toHaveTextContent('reliable_scope');
  });

  it('indisponible : tiret + « Donnée indisponible », jamais 0 %', () => {
    render(<MetricCardFromPayload metric={metric({ metric_name: 'recurring_modification_rate', value: null, numerator: null, denominator: null, unit: null,
      status: 'UNAVAILABLE', reliability: 'UNAVAILABLE', previous_value: null, delta: null, notes: ['RECURRING_DIGEST_MODIFIED is not instrumented.'] })} label="Modifications" />);
    expect(screen.getByTestId('metric-value')).toHaveTextContent('—');
    expect(screen.getByTestId('metric-unavailable')).toHaveTextContent('Donnée indisponible');
    expect(screen.getByTestId('metric-value')).not.toHaveTextContent('0');
    expect(screen.queryByTestId('target-none')).toBeNull();
  });

  it('sans donnée ≠ indisponible ≠ zéro', () => {
    render(<MetricCardFromPayload metric={metric({ value: null, status: 'NO_DATA', previous_value: null, delta: null })} label="Couverture" />);
    expect(screen.getByTestId('metric-nodata')).toHaveTextContent('Aucune donnée sur la période');
    expect(screen.getByTestId('metric-value')).toHaveTextContent('—');
    expect(screen.queryByTestId('metric-unavailable')).toBeNull();
  });

  it('target null : « Aucun objectif configuré », sans couleur d’alerte', () => {
    render(<MetricCardFromPayload metric={metric()} label="Couverture" />);
    const none = screen.getByTestId('target-none');
    expect(none).toHaveTextContent('Aucun objectif configuré');
    expect(screen.queryByTestId('target-WARNING')).toBeNull();
    expect(screen.queryByTestId('target-CRITICAL')).toBeNull();
  });

  it('target existant : objectif, écart en points et statut', () => {
    render(<MetricCardFromPayload metric={metric({ value: 0.45, target: { scope_type: 'GLOBAL', scope_id: null, value: 0.6, warning_threshold: 0.5, critical_threshold: 0.4 }, target_status: 'WARNING' })} label="Couverture" />);
    const line = screen.getByTestId('target-line');
    expect(line).toHaveTextContent('Objectif 60');
    expect(line).toHaveTextContent('−15 pts');
    expect(within(line).getByTestId('target-WARNING')).toHaveTextContent('Alerte');
  });

  it('statut atteint et critique', () => {
    const t = { scope_type: 'GLOBAL', scope_id: null, value: 0.6, warning_threshold: 0.5, critical_threshold: 0.4 };
    const { rerender } = render(<MetricCardFromPayload metric={metric({ value: 0.7, target: t, target_status: 'ON_TARGET' })} />);
    expect(screen.getByTestId('target-ON_TARGET')).toBeInTheDocument();
    rerender(<MetricCardFromPayload metric={metric({ value: 0.2, target: t, target_status: 'CRITICAL' })} />);
    expect(screen.getByTestId('target-CRITICAL')).toHaveTextContent('Critique');
  });

  it('unités mixtes : une ligne par unité, aucun total sans unité', () => {
    render(<MetricCardFromPayload metric={metric({ metric_name: 'recurring_requested_quantity', value: null, numerator: null, denominator: null, unit: null, status: 'MIXED_UNITS',
      previous_value: null, delta: null, breakdown: [
        { canonical_unit: 'KG', numerator: 4200, denominator: null, value: 4200 }, { canonical_unit: 'L', numerator: 850, denominator: null, value: 850 }, { canonical_unit: 'TETE', numerator: 73, denominator: null, value: 73 }] })} label="Demandé" />);
    const list = screen.getByTestId('mixed-units');
    expect(within(list).getAllByRole('listitem').map((li) => li.textContent?.replace(/\s/g, ' '))).toEqual(['4 200 KG', '850 L', '73 TETE']);
    expect(screen.queryByTestId('metric-value')).toBeNull();
  });

  it('ratio de fenêtre commandes/recherche : jamais en % et jamais coloré comme une erreur au-dessus de 1', () => {
    render(<MetricCard label="Commandes par recherche" value={1.5} unit="orders_per_search" reliabilityStatus="RELIABLE" notes={['Window-level ratio; searches and orders are not session-attributed.']} />);
    expect(screen.getByTestId('metric-value')).toHaveTextContent('cmd/recherche');
    expect(screen.getByTestId('metric-value')).not.toHaveTextContent('%');
  });
});

describe('Filters', () => {
  const options = {
    categories: [{ id: CAT, name: 'Légumes' }, { id: '33333333-3333-4333-8333-333333333333', name: 'Bétail' }],
    sub_categories: [{ id: 's1', name: 'Tomate', category_id: CAT }, { id: 's2', name: 'Chèvre', category_id: '33333333-3333-4333-8333-333333333333' }],
    zones: [{ id: ZONE, name: 'Centre', parent_id: null, depth: 0 }, { id: 'z2', name: 'Ouagadougou', parent_id: ZONE, depth: 1 }],
  };
  const state = () => parseUrlState(new URLSearchParams(''), new Date('2026-09-27T00:00:00Z'));

  it('les options viennent de la taxonomie et la sous-catégorie dépend de la catégorie', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Filters state={state()} options={options} onChange={onChange} />);
    expect(screen.getByRole('option', { name: 'Légumes' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '— Ouagadougou' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chèvre' })).toBeInTheDocument();
    rerender(<Filters state={{ ...state(), category: CAT }} options={options} onChange={onChange} />);
    expect(screen.queryByRole('option', { name: 'Chèvre' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Tomate' })).toBeInTheDocument();
  });

  it('changer de catégorie réinitialise la sous-catégorie ; les présets émettent la période', () => {
    const onChange = vi.fn();
    render(<Filters state={state()} options={options} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Catégorie'), { target: { value: CAT } });
    expect(onChange).toHaveBeenCalledWith({ category: CAT, sub: '' });
    fireEvent.click(screen.getByRole('button', { name: '90 j' }));
    expect(onChange).toHaveBeenCalledWith({ period: '90d' });
    expect(screen.getByRole('button', { name: '30 j' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('la période personnalisée expose deux champs date (jours UTC)', () => {
    render(<Filters state={{ ...state(), period: 'custom' }} options={options} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Début (jour UTC)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fin (jour UTC)')).toBeInTheDocument();
  });
});

const row = (over: Record<string, unknown> = {}) => ({
  sub_category_id: 's1', sub_category: 'Oignon', category_id: CAT, category: 'Légumes', zone_id: ZONE, zone: 'Ouagadougou',
  canonical_unit: 'KG', measurement_family: 'MASS', requested: 1500, matched: 260, unmatched: 1240, coverage: 0.17, confirmed: 260, delivered: 100, undelivered_confirmed: 160, ...over,
});
const meta = { generated_at: '', period: { from: '', to: '', timezone: 'UTC', inclusive: true }, filters: { zone_id: null, category_id: null, sub_category_id: null, journey: null }, maturity_days: 7 };

function mockFetch(routes: Record<string, unknown | (() => Response)>) {
  const f = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response(JSON.stringify({ error: `no mock ${url}` }), { status: 404 });
    const v = routes[key];
    return typeof v === 'function' ? (v as () => Response)() : new Response(JSON.stringify(v), { status: 200 });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

describe('Demande non appariée', () => {
  const payload = {
    ...meta,
    unmatched: { definition: 'requested - matched', total: 3, limit: 15, offset: 0, rows: [row(), row({ sub_category: 'Tomate', zone: 'Saaba', unmatched: 430, coverage: 0.4 }), row({ sub_category: 'Chèvre', category: 'Bétail', canonical_unit: 'TETE', unmatched: 18, requested: 18, matched: 0, coverage: 0 })] },
    undelivered_confirmed: { definition: 'confirmed - delivered', reliability: 'PARTIAL', total: 1, rows: [row()] },
    totals_by_unit: [{ canonical_unit: 'KG', requested: 2000, matched: 330, unmatched: 1670, undelivered_confirmed: 160 }, { canonical_unit: 'TETE', requested: 18, matched: 0, unmatched: 18, undelivered_confirmed: 0 }],
  };

  it('affiche sous-catégorie, zone, quantité non appariée avec son unité, et sépare le non-reçu', async () => {
    mockFetch({ 'unmatched-demand': payload });
    render(<UnmatchedDemand params={{ from: '2026-09-01', to: '2026-09-27' }} />);
    const table = await screen.findByTestId('unmatched-table');
    expect(within(table).getByText('Oignon')).toBeInTheDocument();
    expect(within(table).getByText('Saaba')).toBeInTheDocument();
    expect(table.textContent).toMatch(/1\s?240 KG/);
    expect(table.textContent).toMatch(/18 TETE/);
    expect(screen.getByTestId('unmatched-totals').textContent).toMatch(/1\s?670 KG.*18 TETE/);
    const undelivered = screen.getByTestId('undelivered-table');
    expect(undelivered.textContent).toMatch(/160 KG/);
    expect(screen.getByTestId('undelivered-confirmed')).toHaveTextContent('PARTIAL');
    expect(screen.getByTestId('unmatched-demand')).not.toHaveTextContent(/non livr/i);
  });

  it('état vide et état erreur avec réessai', async () => {
    mockFetch({ 'unmatched-demand': { ...payload, unmatched: { ...payload.unmatched, total: 0, rows: [] }, undelivered_confirmed: { ...payload.undelivered_confirmed, total: 0, rows: [] }, totals_by_unit: [] } });
    render(<UnmatchedDemand params={{}} />);
    expect(await screen.findAllByTestId('state-empty')).toHaveLength(2);
    cleanup();
    mockFetch({ 'unmatched-demand': () => new Response(JSON.stringify({ error: 'Le service analytics est momentanément indisponible.' }), { status: 502 }) });
    render(<UnmatchedDemand params={{}} />);
    expect((await screen.findAllByTestId('state-error'))[0]).toHaveTextContent('momentanément indisponible');
  });
});

describe('Analyse de la demande', () => {
  it('couverture par catégorie puis descente vers les sous-catégories', async () => {
    const f = mockFetch({
      'dimension=category_id': { ...meta, metric_name: 'recurring_coverage_rate', dimension: 'category_id', reliability: 'RELIABLE', unit: 'ratio', physical: true, total: 1, limit: 100, offset: 0, notes: [],
        rows: [{ id: CAT, label: 'Légumes', canonical_unit: 'KG', numerator: 720, denominator: 1000, value: 0.72 }] },
      'dimension=sub_category_id': { ...meta, metric_name: 'recurring_coverage_rate', dimension: 'sub_category_id', reliability: 'RELIABLE', unit: 'ratio', physical: true, total: 2, limit: 100, offset: 0, notes: [],
        rows: [{ id: 's1', label: 'Tomate', canonical_unit: 'KG', numerator: 420, denominator: 500, value: 0.84 }, { id: 's2', label: 'Oignon', canonical_unit: 'KG', numerator: 205, denominator: 500, value: 0.41 }] },
    });
    render(<DemandAnalysis params={{ from: '2026-09-01', to: '2026-09-27', zone_id: ZONE }} />);
    const cat = await screen.findByTestId(`demand-category-${CAT}`);
    expect(cat).toHaveTextContent('Légumes');
    expect(cat).toHaveTextContent('72');
    fireEvent.click(within(cat).getByRole('button'));
    expect(await screen.findByTestId('demand-row-s1')).toHaveTextContent('84');
    expect(screen.getByTestId('demand-row-s2')).toHaveTextContent('41');
    const subCall = f.mock.calls.map((c) => String(c[0])).find((u) => u.includes('dimension=sub_category_id')) as string;
    expect(subCall).toContain(`category_id=${CAT}`);
    expect(subCall).toContain(`zone_id=${ZONE}`); // la zone reste appliquée
  });
});

describe('Onglet journey', () => {
  it('cartes issues de l’API ; note DIRECT visible ; métriques indisponibles listées à part', async () => {
    mockFetch({ '/recurring': { ...meta, metrics: {
      recurring_fulfillment_rate: metric({ metric_name: 'recurring_fulfillment_rate', reliability: 'PARTIAL', status: 'PARTIAL', value: 0.3 }),
      recurring_requested_quantity: metric({ metric_name: 'recurring_requested_quantity', value: null, unit: null, status: 'MIXED_UNITS', breakdown: [{ canonical_unit: 'KG', numerator: 10, denominator: null, value: 10 }, { canonical_unit: 'L', numerator: 5, denominator: null, value: 5 }] }),
    }, not_available: [{ metric_name: 'recurring_modification_rate', label: 'Modifications', reason: 'RECURRING_DIGEST_MODIFIED is not instrumented.' }] } });
    render(<JourneyTab tab="recurring" params={{}} />);
    await screen.findByTestId('metric-recurring_fulfillment_rate');
    expect(screen.getByTestId('metric-recurring_requested_quantity')).toHaveAttribute('data-status', 'MIXED_UNITS');
    const na = screen.getByTestId('not-available');
    expect(na).toHaveTextContent('Métriques pas encore disponibles (1)');
    expect(na).toHaveTextContent('not instrumented');
  });

  it('DIRECT : la note de ratio de fenêtre est affichée', async () => {
    mockFetch({ '/direct': { ...meta, metrics: { direct_orders_per_search: metric({ metric_name: 'direct_orders_per_search', unit: 'orders_per_search', value: 1.5 }) },
      notes: ['direct_orders_per_search is a window-level ratio: searches and orders are not session-attributed (it can exceed 1 and is not a conversion rate).'] } });
    render(<JourneyTab tab="direct" params={{}} />);
    expect(await screen.findByText(/window-level ratio/)).toBeInTheDocument();
  });

  it('chargement puis erreur', async () => {
    mockFetch({ '/tenders': () => new Response(JSON.stringify({ error: 'Accès réservé aux administrateurs.' }), { status: 403 }) });
    render(<JourneyTab tab="tenders" params={{}} />);
    expect(screen.getByTestId('state-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('state-error')).toHaveTextContent('réservé aux administrateurs');
  });
});

describe('Santé et fraîcheur', () => {
  const base: HealthResponse = { status: 'Healthy', generated_at: '', issues: [], freshness: { last_refresh: new Date(Date.now() - 2 * 3600_000).toISOString(), age_seconds: 7200, stale: false, stale_after_hours: 36, tables: {} } };
  it('sain : indique la dernière mise à jour', () => {
    render(<HealthBadge health={base} />);
    expect(screen.getByTestId('analytics-health')).toHaveAttribute('data-status', 'Healthy');
    expect(screen.getByTestId('last-refresh')).toHaveTextContent('il y a 2 h');
  });
  it('périmé : avertissement explicite', () => {
    render(<HealthBadge health={{ ...base, status: 'Stale', freshness: { ...base.freshness, stale: true } }} />);
    expect(screen.getByTestId('analytics-health')).toHaveTextContent('PÉRIMÉES');
    expect(screen.getByTestId('analytics-health')).toHaveTextContent('périmés');
  });
  it('avertissement : liste les points de qualité', () => {
    render(<HealthBadge health={{ ...base, status: 'Warning', issues: [{ check: 'unknown_canonical_unit', table: 't', severity: 'WARNING', count: 2, detail: 'Units outside the registry: BIDON' }] }} />);
    expect(screen.getByTestId('analytics-health')).toHaveTextContent('1 point(s) de qualité');
  });
});

describe('série temporelle', () => {
  it('null reste un trou et une ligne par unité pour les séries physiques', () => {
    const { rows, keys } = pivotSeries([
      { bucket: '2026-09-01', canonical_unit: 'KG', numerator: 1, denominator: 2, value: 0.5 },
      { bucket: '2026-09-01', canonical_unit: 'L', numerator: 1, denominator: 1, value: 1 },
      { bucket: '2026-09-02', canonical_unit: 'KG', numerator: 0, denominator: 0, value: null },
    ]);
    expect(keys).toEqual(['KG', 'L']);
    expect(rows[1].KG).toBeNull(); // jamais converti en 0
    expect(rows[0]).toMatchObject({ KG: 0.5, L: 1 });
  });
});

describe('page complète', () => {
  const overview = {
    ...meta,
    metrics: {
      active_buyers: metric({ metric_name: 'active_buyers', value: 42, unit: 'buyers', previous_value: 30, delta: 12, delta_kind: 'relative', delta_pct: 0.4, delta_points: undefined }),
      needs_created: metric({ metric_name: 'needs_created', value: 310, unit: 'count', delta_kind: 'relative', delta_pct: 0.1 }),
      successful_procurement_rate: metric({ metric_name: 'successful_procurement_rate', value: 0.58, reliability: 'PARTIAL', status: 'PARTIAL', notes: ['Reliable scope: DIRECT + TENDER.'] }),
      repeat_buyer_rate: metric({ metric_name: 'repeat_buyer_rate', value: 0.2, reliability: 'PARTIAL' }),
      potential_gmv: metric({ metric_name: 'potential_gmv', value: 5_000_000, unit: 'FCFA', reliability: 'PARTIAL' }),
      confirmed_gmv: metric({ metric_name: 'confirmed_gmv', value: 3_000_000, unit: 'FCFA' }),
      delivered_gmv: metric({ metric_name: 'delivered_gmv', value: 2_000_000, unit: 'FCFA', reliability: 'PARTIAL' }),
    },
    journey_mix: [{ journey: 'DIRECT', needs: 200, satisfied: 90, reliability: 'RELIABLE' }, { journey: 'TENDER', needs: 10, satisfied: 4, reliability: 'RELIABLE' }, { journey: 'RECURRING', needs: 100, satisfied: 30, reliability: 'PARTIAL' }],
    not_available: [], freshness: { last_refresh: new Date().toISOString(), age_seconds: 5, stale: false, stale_after_hours: 36, tables: {} },
  };

  beforeEach(() => {
    mockFetch({
      '/timeseries': { ...meta, metric_name: 'x', granularity: 'day', reliability: 'RELIABLE', unit: 'ratio', physical: false, points: [{ bucket: '2026-09-01', numerator: 1, denominator: 2, value: 0.5 }], notes: [] },
      '/overview': overview,
      '/filters': { categories: [{ id: CAT, name: 'Légumes' }], sub_categories: [], zones: [{ id: ZONE, name: 'Centre', parent_id: null, depth: 0 }] },
      '/health': { status: 'Healthy', generated_at: '', issues: [], freshness: overview.freshness },
      '/direct': { ...meta, metrics: {} },
      'dimension=category_id': { ...meta, metric_name: 'recurring_coverage_rate', dimension: 'category_id', reliability: 'RELIABLE', unit: 'ratio', physical: true, total: 0, limit: 100, offset: 0, rows: [], notes: [] },
      '/unmatched-demand': { ...meta, unmatched: { definition: '', total: 0, limit: 15, offset: 0, rows: [] }, undelivered_confirmed: { definition: '', reliability: 'PARTIAL', total: 0, rows: [] }, totals_by_unit: [] },
    });
  });

  it('affiche les 7 KPI prioritaires et jamais le fulfillment_rate global indisponible', async () => {
    render(<BuyerAnalyticsPage />);
    const kpis = await screen.findByTestId('kpis');
    await waitFor(() => expect(within(kpis).getAllByRole('article')).toHaveLength(7));
    expect(within(kpis).getByTestId('metric-successful_procurement_rate')).toHaveTextContent('PARTIAL');
    expect(within(kpis).queryByText(/exécution/i)).toBeNull();
    expect(await screen.findByTestId('analytics-health')).toHaveAttribute('data-status', 'Healthy');
    expect(await screen.findByTestId('journey-mix')).toHaveTextContent('90 satisfaits');
    expect(screen.getAllByTestId(/^trend-/).length).toBeGreaterThanOrEqual(7);
  });

  it('les filtres sont écrits dans l’URL', async () => {
    render(<BuyerAnalyticsPage />);
    await screen.findByTestId('kpis');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Centre' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Zone'), { target: { value: ZONE } });
    expect(replace).toHaveBeenLastCalledWith(`/admin/analytics/buyers?zone=${ZONE}`, { scroll: false });
    fireEvent.click(screen.getByRole('tab', { name: 'RÉCURRENT' }));
    expect(replace).toHaveBeenLastCalledWith('/admin/analytics/buyers?tab=recurring', { scroll: false });
  });

  it('lit l’état initial depuis l’URL (partage / rafraîchissement)', async () => {
    currentSearch = `period=7d&zone=${ZONE}&tab=tenders`;
    const f = mockFetch({ '/timeseries': { ...meta, points: [], notes: [], unit: 'ratio', reliability: 'RELIABLE' }, '/overview': overview, '/filters': { categories: [], sub_categories: [], zones: [] }, '/health': { status: 'Stale', generated_at: '', issues: [], freshness: { ...overview.freshness, stale: true, last_refresh: null } }, '/tenders': { ...meta, metrics: {} },
      'dimension=': { rows: [], reliability: 'RELIABLE' }, '/unmatched-demand': { ...meta, unmatched: { rows: [], total: 0 }, undelivered_confirmed: { rows: [], reliability: 'PARTIAL' }, totals_by_unit: [] } });
    render(<BuyerAnalyticsPage />);
    await screen.findByTestId('kpis');
    const overviewCall = f.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/overview')) as string;
    expect(overviewCall).toContain(`zone_id=${ZONE}`);
    expect(overviewCall).toMatch(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
    expect(screen.getByRole('tab', { name: 'APPELS D’OFFRES' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('analytics-health')).toHaveTextContent('PÉRIMÉES');
  });

  it('erreur globale : message et bouton réessayer', async () => {
    mockFetch({ '/timeseries': { ...meta, points: [], notes: [], unit: 'ratio', reliability: 'RELIABLE' }, '/overview': () => new Response(JSON.stringify({ error: 'Le service analytics est momentanément indisponible.' }), { status: 502 }),
      '/filters': { categories: [], sub_categories: [], zones: [] }, '/health': () => new Response('{}', { status: 502 }),
      '/direct': { ...meta, metrics: {} }, 'dimension=': { rows: [], reliability: 'RELIABLE' },
      '/unmatched-demand': { ...meta, unmatched: { rows: [], total: 0 }, undelivered_confirmed: { rows: [], reliability: 'PARTIAL' }, totals_by_unit: [] } });
    render(<BuyerAnalyticsPage />);
    const kpis = await screen.findByTestId('kpis');
    expect(await within(kpis).findByTestId('state-error')).toHaveTextContent('momentanément indisponible');
    expect(within(kpis).getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });
});
