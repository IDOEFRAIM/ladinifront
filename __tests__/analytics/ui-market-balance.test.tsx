// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import MarketBalancePage from '@/features/analytics/ui/MarketBalancePage';
import type { BalanceRow } from '@/features/analytics/types.market-balance';

const CAT = '22222222-2222-4222-8222-222222222222';
const ZONE = '11111111-1111-4111-8111-111111111111';

function row(over: Partial<BalanceRow> = {}): BalanceRow {
  return {
    zone: ZONE, zone_label: 'Ouagadougou', category: CAT, category_label: 'Légumes', subcategory: 's1', subcategory_label: 'Tomate',
    canonical_unit: 'KG', open_demand_quantity: 8000, available_supply_quantity: 6500, potential_coverable_quantity: 6500,
    potential_coverage_rate: 0.8125, demand_gap_quantity: 1500, excess_supply_quantity: 0, demand_reliability: 'RELIABLE',
    supply_reliability: 'RELIABLE', reliable_scope: 'RECURRING', as_of: '2026-09-27', notes: [], ...over,
  };
}

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

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Cockpit Market Balance', () => {
  const overview = {
    status: 'OK', as_of: '2026-09-27', generated_at: '',
    by_unit: [
      { canonical_unit: 'KG', open_demand_quantity: 8000, available_supply_quantity: 6500, potential_coverable_quantity: 6500,
        potential_coverage_rate: 0.8125, demand_gap_quantity: 1500, excess_supply_quantity: 0, reliable_scope: ['RECURRING'] },
      { canonical_unit: 'TETE', open_demand_quantity: 10, available_supply_quantity: 40, potential_coverable_quantity: 10,
        potential_coverage_rate: 1, demand_gap_quantity: 0, excess_supply_quantity: 30, reliable_scope: ['RECURRING', 'TENDER'] },
    ],
  };
  const current = { status: 'OK', as_of: '2026-09-27', generated_at: '', rows: [row()] };
  const gaps = { status: 'OK', as_of: '2026-09-27', generated_at: '', groups: [{ canonical_unit: 'KG', rows: [row()] }] };
  const excess = { status: 'OK', as_of: '2026-09-27', generated_at: '', groups: [{ canonical_unit: 'TETE', rows: [row({ canonical_unit: 'TETE', excess_supply_quantity: 30, demand_gap_quantity: 0, reliable_scope: 'TENDER', demand_reliability: 'PARTIAL' })] }] };

  beforeEach(() => {
    mockFetch({
      '/overview': overview,
      '/current': current,
      '/demand-gaps': gaps,
      '/excess-supply': excess,
      '/filters': { categories: [{ id: CAT, name: 'Légumes' }], sub_categories: [], zones: [{ id: ZONE, name: 'Ouagadougou', parent_id: null, depth: 0 }] },
      '/health': { status: 'Healthy', generated_at: '', issues: [], freshness: { last_refresh: new Date().toISOString(), age_seconds: 5, stale: false, stale_after_hours: 36, tables: {} } },
    });
  });

  it('affiche les totaux par unité, jamais un total unique mélangeant KG et TETE', async () => {
    render(<MarketBalancePage />);
    const kg = await screen.findByTestId('mb-unit-KG');
    expect(within(kg).getByTestId('mb-open-demand')).toHaveTextContent('8');
    const tete = screen.getByTestId('mb-unit-TETE');
    expect(tete).toBeInTheDocument();
    // Two separate cards, one per unit -- never a combined figure.
    expect(screen.getAllByTestId(/^mb-unit-/)).toHaveLength(2);
  });

  it('affiche les écarts de demande groupés par unité avec les libellés zone/sous-catégorie', async () => {
    render(<MarketBalancePage />);
    const section = await screen.findByTestId('mb-demand-gaps');
    expect(section).toHaveTextContent('Ouagadougou');
    expect(section).toHaveTextContent('Tomate');
    expect(section).toHaveTextContent('Signal de sourcing');
  });

  it('affiche le surplus d’offre séparément, avec le badge PARTIAL pour TENDER', async () => {
    render(<MarketBalancePage />);
    const section = await screen.findByTestId('mb-excess-supply');
    expect(section).toHaveTextContent('Signal d’acquisition');
    expect(within(section).getByTestId('reliability-PARTIAL')).toBeInTheDocument();
  });

  it('affiche la matrice de pilotage avec toutes les colonnes', async () => {
    render(<MarketBalancePage />);
    const matrix = await screen.findByTestId('mb-matrix');
    const rows = await within(matrix).findAllByTestId('mb-matrix-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Ouagadougou');
    expect(rows[0]).toHaveTextContent('81');
  });

  it('les filtres relancent les requêtes avec les bons paramètres', async () => {
    const f = mockFetch({
      '/overview': overview, '/current': current, '/demand-gaps': gaps, '/excess-supply': excess,
      '/filters': { categories: [{ id: CAT, name: 'Légumes' }], sub_categories: [], zones: [{ id: ZONE, name: 'Ouagadougou', parent_id: null, depth: 0 }] },
      '/health': { status: 'Healthy', generated_at: '', issues: [], freshness: { last_refresh: new Date().toISOString(), age_seconds: 5, stale: false, stale_after_hours: 36, tables: {} } },
    });
    render(<MarketBalancePage />);
    await screen.findByTestId('mb-overview');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Ouagadougou' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Zone'), { target: { value: ZONE } });
    await waitFor(() => {
      const overviewCalls = f.mock.calls.map((c) => String(c[0])).filter((u) => u.includes('/overview'));
      expect(overviewCalls.at(-1)).toContain(`zone_scope=${ZONE}`);
    });
  });

  it('overview indisponible : message explicite, pas un tableau vide silencieux', async () => {
    mockFetch({
      '/overview': { status: 'UNAVAILABLE', as_of: null, by_unit: [], generated_at: '', notes: ['No Market Balance snapshot has been generated yet.'] },
      '/current': { status: 'UNAVAILABLE', as_of: null, rows: [], generated_at: '' },
      '/demand-gaps': { status: 'UNAVAILABLE', as_of: null, groups: [], generated_at: '' },
      '/excess-supply': { status: 'UNAVAILABLE', as_of: null, groups: [], generated_at: '' },
      '/filters': { categories: [], sub_categories: [], zones: [] },
      '/health': { status: 'Stale', generated_at: '', issues: [], freshness: { last_refresh: null, age_seconds: null, stale: true, stale_after_hours: 36, tables: {} } },
    });
    render(<MarketBalancePage />);
    expect(await screen.findByTestId('mb-overview-unavailable')).toHaveTextContent('No Market Balance snapshot');
    expect(await screen.findByTestId('analytics-health')).toHaveTextContent('PÉRIMÉES');
  });
});
