'use client';

import React, { useState } from 'react';
import { C, Card, DataState } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { fmtQuantity, fmtRatioPct } from '../format';
import type { DemandRow, UnmatchedResponse } from '../types';
import { ReliabilityBadge } from './MetricCard';

const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, color: C.muted, fontWeight: 700, padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '7px 8px', fontSize: 13, borderTop: `1px solid ${C.border}` };
const PAGE = 15;

function DemandTable({ rows, quantity, testId }: { rows: DemandRow[]; quantity: 'unmatched' | 'undelivered_confirmed'; testId: string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table data-testid={testId} style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr>
            <th style={th}>Sous-catégorie</th><th style={th}>Zone</th>
            <th style={th}>{quantity === 'unmatched' ? 'Non apparié' : 'Confirmé, non reçu'}</th>
            <th style={th}>{quantity === 'unmatched' ? 'Couverture' : 'Confirmé'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.sub_category_id}-${r.zone_id}-${r.canonical_unit}`}>
              <td style={td}><b style={{ color: C.forest }}>{r.sub_category}</b><span style={{ color: C.muted }}> · {r.category}</span></td>
              <td style={td}>{r.zone}</td>
              <td style={{ ...td, fontWeight: 800, color: C.forest }}>{fmtQuantity(r[quantity], r.canonical_unit)}</td>
              <td style={{ ...td, color: C.muted }}>
                {quantity === 'unmatched' ? `${fmtRatioPct(r.coverage, 0)} (${fmtQuantity(r.matched, r.canonical_unit)} / ${fmtQuantity(r.requested, r.canonical_unit)})` : `${fmtQuantity(r.confirmed, r.canonical_unit)} · reçu ${fmtQuantity(r.delivered, r.canonical_unit)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Deux problèmes DISTINCTS, deux sections :
 *  - DEMANDE NON APPARIÉE (demandé − apparié) : pas assez d'offre trouvée → priorité de sourcing ;
 *  - CONFIRMÉ MAIS NON REÇU (confirmé − reçu) : offre confirmée, réception pas (encore) confirmée par l'acheteur.
 * Jamais mélangées, jamais appelées « demande non livrée ». Les quantités portent toujours leur unité.
 */
export function UnmatchedDemand({ params }: { params: Record<string, string> }) {
  const [limit, setLimit] = useState(PAGE);
  const { data, error, loading, refetch } = useCockpitData<UnmatchedResponse>('/api/admin/analytics/buyers/unmatched-demand', { ...params, limit });
  const total = data?.unmatched.total ?? 0;
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card testId="unmatched-demand" title="Demande non appariée" subtitle="Demandé − apparié : l'offre trouvée n'a pas couvert le besoin (priorité de sourcing)">
        <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.unmatched.rows.length === 0} emptyText="Aucune demande non appariée sur la période." onRetry={refetch}>
          {data && (
            <>
              <ul data-testid="unmatched-totals" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', listStyle: 'none', margin: '0 0 10px', padding: 0, fontSize: 13 }}>
                {data.totals_by_unit.map((t) => (
                  <li key={t.canonical_unit}><b style={{ color: C.forest }}>{fmtQuantity(t.unmatched, t.canonical_unit)}</b> <span style={{ color: C.muted }}>non apparié</span></li>
                ))}
              </ul>
              <DemandTable rows={data.unmatched.rows} quantity="unmatched" testId="unmatched-table" />
              {total > data.unmatched.rows.length && (
                <button type="button" onClick={() => setLimit((l) => Math.min(l + PAGE, 200))} disabled={limit >= 200}
                  style={{ marginTop: 10, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Voir plus ({data.unmatched.rows.length}/{total})
                </button>
              )}
            </>
          )}
        </DataState>
      </Card>

      <Card testId="undelivered-confirmed" title="Confirmé mais non reçu" subtitle="Confirmé − reçu : offre confirmée dont la réception n'est pas (encore) confirmée par l'acheteur"
        right={data && <ReliabilityBadge reliability={data.undelivered_confirmed.reliability} title={data.undelivered_confirmed.definition} />}>
        <DataState loading={loading} error={error} hasData={!!data} empty={!!data && data.undelivered_confirmed.rows.length === 0} emptyText="Aucune quantité confirmée en attente de réception." onRetry={refetch}>
          {data && <DemandTable rows={data.undelivered_confirmed.rows} quantity="undelivered_confirmed" testId="undelivered-table" />}
        </DataState>
      </Card>
    </div>
  );
}
