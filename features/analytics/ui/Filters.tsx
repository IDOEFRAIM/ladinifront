'use client';

import React from 'react';
import { C } from '@/features/monitoring/cockpit/ui/primitives';
import type { PeriodKey, UrlState } from '../range';
import type { FilterOptions } from '../types';

const PERIODS: { v: PeriodKey; l: string }[] = [{ v: '7d', l: '7 j' }, { v: '30d', l: '30 j' }, { v: '90d', l: '90 j' }, { v: 'custom', l: 'Personnalisée' }];
const sel: React.CSSProperties = { padding: '6px 10px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12, background: '#fff', maxWidth: 220 };

/** Filtres globaux : période (jours UTC), zone, catégorie, sous-catégorie. Les options viennent de la vraie taxonomie admin. */
export function Filters({ state, options, onChange }: { state: UrlState; options: FilterOptions | null; onChange: (patch: Partial<UrlState>) => void }) {
  const subs = (options?.sub_categories ?? []).filter((s) => !state.category || s.category_id === state.category);
  return (
    <div data-testid="filters" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <div role="group" aria-label="Période" style={{ display: 'flex', background: 'rgba(6,78,59,0.05)', borderRadius: 100, padding: 3 }}>
        {PERIODS.map((p) => (
          <button key={p.v} type="button" aria-pressed={state.period === p.v} onClick={() => onChange({ period: p.v })}
            style={{ border: 'none', cursor: 'pointer', padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, background: state.period === p.v ? '#fff' : 'transparent', color: state.period === p.v ? C.forest : C.muted }}>{p.l}</button>
        ))}
      </div>
      {state.period === 'custom' && (
        <>
          <input type="date" aria-label="Début (jour UTC)" value={state.from} max={state.to} onChange={(e) => e.target.value && onChange({ from: e.target.value })} style={sel} />
          <input type="date" aria-label="Fin (jour UTC)" value={state.to} min={state.from} onChange={(e) => e.target.value && onChange({ to: e.target.value })} style={sel} />
        </>
      )}
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
      <span style={{ fontSize: 11, color: C.muted }}>Jours UTC, bornes incluses</span>
    </div>
  );
}
