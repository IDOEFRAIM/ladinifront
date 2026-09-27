'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { C, Card, DataState } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { DASH, fmtQuantity, fmtRatioPct } from '../format';
import type { BreakdownResponse, BreakdownRow } from '../types';
import { ReliabilityBadge } from './MetricCard';

const BASE = '/api/admin/analytics/buyers/metrics/recurring_coverage_rate/breakdown';

const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, color: C.muted, fontWeight: 700, padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' };
const td: React.CSSProperties = { padding: '7px 8px', fontSize: 13, borderTop: `1px solid ${C.border}` };

function Rows({ rows, indent }: { rows: BreakdownRow[]; indent: number }) {
  return (
    <>
      {rows.map((r) => (
        <tr key={`${r.id}-${r.canonical_unit}`} data-testid={`demand-row-${r.id}`}>
          <td style={{ ...td, paddingLeft: 8 + indent }}>{r.label}</td>
          <td style={td}>{r.canonical_unit ?? DASH}</td>
          <td style={{ ...td, fontWeight: 700 }}>{fmtRatioPct(r.value, 0)}</td>
          <td style={{ ...td, color: C.muted }}>{fmtQuantity(r.numerator, r.canonical_unit)} / {fmtQuantity(r.denominator, r.canonical_unit)}</td>
        </tr>
      ))}
    </>
  );
}

/** Sous-catégories d'UNE catégorie (chargées à l'ouverture). */
function SubRows({ categoryId, params }: { categoryId: string; params: Record<string, string> }) {
  const rest = { ...params };
  delete rest.sub_category_id; // la catégorie ouverte prime sur le filtre de sous-catégorie global
  const { data, error, loading, refetch } = useCockpitData<BreakdownResponse>(BASE, { ...rest, category_id: categoryId, dimension: 'sub_category_id', limit: 100 });
  return (
    <>
      {loading && !data && <tr><td colSpan={4} style={{ ...td, color: C.muted }}>Chargement…</td></tr>}
      {error && !data && <tr><td colSpan={4} role="alert" style={{ ...td, color: '#991B1B' }}>{error} <button type="button" onClick={refetch}>Réessayer</button></td></tr>}
      {data && <Rows rows={data.rows} indent={28} />}
    </>
  );
}

/** Couverture de la demande récurrente par catégorie, avec descente vers les sous-catégories (les filtres globaux, dont la zone, s'appliquent). */
export function DemandAnalysis({ params }: { params: Record<string, string> }) {
  const [open, setOpen] = useState<string | null>(null);
  const { data, error, loading, refetch } = useCockpitData<BreakdownResponse>(BASE, { ...params, dimension: 'category_id', limit: 100 });
  return (
    <Card testId="demand-analysis" title="Analyse de la demande" subtitle="Taux de couverture récurrente (apparié / demandé) par catégorie — cliquer une catégorie pour ses sous-catégories"
      right={data && <ReliabilityBadge reliability={data.reliability} />}>
      <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.rows.length === 0} emptyText="Aucune demande récurrente sur la période." onRetry={refetch}>
        {data && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
              <thead><tr><th style={th}>Catégorie / sous-catégorie</th><th style={th}>Unité</th><th style={th}>Couverture</th><th style={th}>Apparié / demandé</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <React.Fragment key={`${r.id}-${r.canonical_unit}`}>
                    <tr data-testid={`demand-category-${r.id}`}>
                      <td style={td}>
                        <button type="button" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center', fontWeight: 700, color: C.forest, padding: 0 }}>
                          {open === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}{r.label}
                        </button>
                      </td>
                      <td style={td}>{r.canonical_unit ?? DASH}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{fmtRatioPct(r.value, 0)}</td>
                      <td style={{ ...td, color: C.muted }}>{fmtQuantity(r.numerator, r.canonical_unit)} / {fmtQuantity(r.denominator, r.canonical_unit)}</td>
                    </tr>
                    {open === r.id && <SubRows categoryId={r.id} params={params} />}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </Card>
  );
}
