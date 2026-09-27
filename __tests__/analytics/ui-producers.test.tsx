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
  usePathname: () => '/admin/analytics/producers',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

import ProducerAnalyticsPage from '@/features/analytics/ui/ProducerAnalyticsPage';
import type { MetricPayload } from '@/features/analytics/types';

const ZONE = '11111111-1111-4111-8111-111111111111';
const CAT = '22222222-2222-4222-8222-222222222222';

function metric(over: Partial<MetricPayload> = {}): MetricPayload {
  return {
    metric_name: 'producer_order_fulfillment_rate', label: 'Commandes', value: 0.72, numerator: 180, denominator: 250, unit: 'ratio',
    status: 'OK', reliability: 'RELIABLE', period: { start: 'a', end: 'b' }, target: null, target_status: 'NO_TARGET',
    previous_value: 0.65, delta: 0.07, delta_kind: 'percentage_points', delta_points: 7, delta_pct: null, breakdown: [], notes: [], ...over,
  };
}

const meta = { generated_at: '', period: { from: '', to: '', timezone: 'UTC', inclusive: true }, filters: { zone_id: null, category_id: null, sub_category_id: null, journey: null }, maturity_days: 0 };

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

afterEach(() => { cleanup(); vi.unstubAllGlobals(); replace.mockReset(); currentSearch = ''; });

describe('Cockpit producteurs', () => {
  const overview = {
    ...meta,
    metrics: {
      active_producers: metric({ metric_name: 'active_producers', label: 'Producteurs actifs', value: 42, unit: 'producers', numerator: 42, denominator: null, delta_kind: 'relative', delta_pct: 0.1 }),
      producer_order_fulfillment_rate: metric(),
      producer_quantity_fulfillment_rate: metric({ metric_name: 'producer_quantity_fulfillment_rate', value: null, numerator: null, denominator: null, unit: null, status: 'MIXED_UNITS',
        previous_value: null, delta: null, reliability: 'PARTIAL',
        breakdown: [{ canonical_unit: 'KG', numerator: 200, denominator: 250, value: 0.8 }, { canonical_unit: 'TETE', numerator: 10, denominator: 12, value: 0.83 }] }),
      producer_delivered_gmv: metric({ metric_name: 'producer_delivered_gmv', value: 4_000_000, unit: 'FCFA', delta_kind: 'relative', delta_pct: 0.3 }),
      delivered_gmv_per_active_producer: metric({ metric_name: 'delivered_gmv_per_active_producer', value: 95_000, unit: 'FCFA', delta_kind: 'relative', delta_pct: 0.1 }),
      repeat_producer_rate: metric({ metric_name: 'repeat_producer_rate', value: 0.35, reliability: 'PARTIAL' }),
      time_to_first_sale: metric({ metric_name: 'time_to_first_sale', value: 12.4, unit: 'days', reliability: 'PARTIAL', numerator: 12.4, denominator: 8 }),
    },
    not_available: [
      { metric_name: 'producer_sell_through_rate', label: 'Taux d’écoulement', reason: 'No reliable restock signal exists yet.' },
      { metric_name: 'demand_exposure_rate', label: 'Exposition à la demande', reason: 'DIRECT/TENDER have no exposure instrumentation.' },
    ],
    freshness: { last_refresh: new Date().toISOString(), age_seconds: 5, stale: false, stale_after_hours: 36, tables: {} },
  };

  beforeEach(() => {
    mockFetch({
      '/timeseries': { ...meta, metric_name: 'x', granularity: 'day', reliability: 'RELIABLE', unit: 'ratio', physical: false, points: [{ bucket: '2026-09-01', numerator: 1, denominator: 2, value: 0.5 }], notes: [] },
      '/overview': overview,
      '/supply': { ...meta, metric: metric({ metric_name: 'available_supply', label: 'Offre disponible', value: 250, unit: 'KG', numerator: 250, denominator: null, previous_value: null, delta: null, target: null, target_status: 'NO_TARGET' }) },
      '/fulfillment': { ...meta, metrics: { producer_order_fulfillment_rate: metric(), producer_quantity_fulfillment_rate: overview.metrics.producer_quantity_fulfillment_rate },
        notes: ['producer_quantity_fulfillment_rate is DIRECT+RECURRING only.'] },
      '/gmv': { ...meta, metrics: { producer_delivered_gmv: overview.metrics.producer_delivered_gmv, delivered_gmv_per_active_producer: overview.metrics.delivered_gmv_per_active_producer } },
      '/retention': { ...meta, metrics: { repeat_producer_rate: overview.metrics.repeat_producer_rate }, notes: ["repeat_producer_rate's window is PROVISIONAL."] },
      '/filters': { categories: [{ id: CAT, name: 'Légumes' }], sub_categories: [], zones: [{ id: ZONE, name: 'Centre', parent_id: null, depth: 0 }] },
      '/health': { status: 'Healthy', generated_at: '', issues: [], freshness: overview.freshness },
    });
  });

  it('affiche les 7 KPI pilotes, la jauge d’offre en direct, et jamais un chiffre fabriqué pour sell-through/exposition', async () => {
    render(<ProducerAnalyticsPage />);
    const kpis = await screen.findByTestId('kpis');
    await waitFor(() => expect(within(kpis).getAllByRole('article')).toHaveLength(7));
    expect(within(kpis).getByTestId('metric-active_producers')).toHaveTextContent('42');
    expect(within(kpis).getByTestId('metric-producer_quantity_fulfillment_rate')).toHaveAttribute('data-status', 'MIXED_UNITS');
    expect(within(kpis).getByTestId('metric-time_to_first_sale')).toHaveTextContent('12,4');

    const na = screen.getByTestId('not-available');
    expect(na).toHaveTextContent('Métriques pas encore disponibles (2)');
    expect(na).toHaveTextContent('Taux d’écoulement');
    expect(na).toHaveTextContent('No reliable restock signal');

    const gauge = await screen.findByTestId('supply-gauge');
    expect(within(gauge).getByTestId('metric-value')).toHaveTextContent('250');
    expect(await screen.findByTestId('analytics-health')).toHaveAttribute('data-status', 'Healthy');
  });

  it('affiche exécution, GMV et fidélisation dans des sections séparées', async () => {
    render(<ProducerAnalyticsPage />);
    await screen.findByTestId('kpis');
    const fulfillment = await screen.findByTestId('fulfillment-section');
    expect(within(fulfillment).getByTestId('metric-producer_order_fulfillment_rate')).toBeInTheDocument();
    expect(within(fulfillment).getByTestId('fulfillment-notes')).toHaveTextContent('DIRECT+RECURRING only');

    const gmv = await screen.findByTestId('gmv-section');
    expect(within(gmv).getByTestId('metric-producer_delivered_gmv')).toBeInTheDocument();
    expect(within(gmv).getByTestId('metric-delivered_gmv_per_active_producer')).toBeInTheDocument();

    const retention = await screen.findByTestId('retention-section');
    expect(within(retention).getByTestId('metric-repeat_producer_rate')).toHaveTextContent('PARTIAL');
    expect(within(retention).getByTestId('retention-notes')).toHaveTextContent('PROVISIONAL');
  });

  it('les filtres sont écrits dans l’URL (pas d’onglet journey ici, contrairement au cockpit acheteurs)', async () => {
    render(<ProducerAnalyticsPage />);
    await screen.findByTestId('kpis');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Centre' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Zone'), { target: { value: ZONE } });
    expect(replace).toHaveBeenLastCalledWith(`/admin/analytics/producers?zone=${ZONE}`, { scroll: false });
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('offre indisponible : jamais un zéro silencieux', async () => {
    mockFetch({ ...{
      '/timeseries': { ...meta, points: [], notes: [], unit: 'ratio', reliability: 'RELIABLE' },
      '/overview': overview,
      '/supply': { ...meta, metric: metric({ metric_name: 'available_supply', value: null, numerator: null, denominator: null, unit: null, status: 'UNAVAILABLE', reliability: 'UNAVAILABLE', previous_value: null, delta: null, notes: ['No supply snapshot has been generated yet.'] }) },
      '/fulfillment': { ...meta, metrics: {} }, '/gmv': { ...meta, metrics: {} }, '/retention': { ...meta, metrics: {} },
      '/filters': { categories: [], sub_categories: [], zones: [] },
      '/health': { status: 'Healthy', generated_at: '', issues: [], freshness: overview.freshness },
    } });
    render(<ProducerAnalyticsPage />);
    const gauge = await screen.findByTestId('supply-gauge');
    expect(within(gauge).getByTestId('metric-unavailable')).toHaveTextContent('Donnée indisponible');
    expect(within(gauge).getByTestId('metric-value')).toHaveTextContent('—');
  });
});
