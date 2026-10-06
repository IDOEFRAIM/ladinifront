'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Select, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import type { NeedRow, NeedsPayload } from '../types';
import {
  FREQUENCY_LABELS, NEED_STATUS_LABELS, OCCURRENCE_STATUS_LABELS,
  describeFrequency, fmtAgo, fmtDay, fmtQty,
} from './format';
import { NeedDrawer } from './NeedDrawer';
import { Pill, TextField, linkBtn, pagerBtn } from './parts';

/**
 * Recurring › Besoins (OPERATIONS) — inspecter UN besoin récurrent réel : liste filtrable + fiche détaillée
 * (aperçu, planning, occurrences et allocations, commandes, état opérationnel).
 *
 * LECTURE SEULE : aucune action ne modifie un besoin d'ici (toute mutation passe par le service métier).
 * Les AGRÉGATS (volumes, taux de matching…) vivent dans Analytics, pas ici.
 */

const STATUS_OPTIONS = [{ value: '', label: 'Tous' }, ...Object.entries(NEED_STATUS_LABELS).map(([value, label]) => ({ value, label }))];
const FREQUENCY_OPTIONS = [{ value: '', label: 'Toutes' }, ...Object.entries(FREQUENCY_LABELS).map(([value, label]) => ({ value, label }))];

interface Filters {
  status: string; frequency: string; product: string; region: string; buyer: string; q: string;
  starts_from: string; starts_to: string; next_from: string; next_to: string;
}
const EMPTY: Filters = { status: '', frequency: '', product: '', region: '', buyer: '', q: '', starts_from: '', starts_to: '', next_from: '', next_to: '' };

export function RecurringNeedsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = 25;

  const { data, loading, error, refetch } = useCockpitData<NeedsPayload>('/api/admin/recurring/needs', { ...filters, limit, offset });
  const set = <K extends keyof Filters>(key: K) => (value: string) => { setFilters((f) => ({ ...f, [key]: value })); setOffset(0); };
  const active = Object.values(filters).some((v) => v !== '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F.body }}>
      <div>
        <h1 style={{ fontFamily: F.heading, fontSize: 22, color: C.forest, margin: 0 }}>Recurring — Besoins</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
          Inspection d&apos;un besoin réel (lecture seule).{' '}
          <Link href="/admin/recurring/settings" style={{ color: C.forest, fontWeight: 600 }}>Réglages</Link>
          {' · '}
          <Link href="/admin/analytics/buyers" style={{ color: C.forest, fontWeight: 600 }}>Analytics acheteurs</Link>
          {' (performance globale)'}
        </p>
      </div>

      <Card title="Filtres" testId="recurring-filters" right={active ? <button onClick={() => { setFilters(EMPTY); setOffset(0); }} style={linkBtn}>Réinitialiser</button> : undefined}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <TextField label="Recherche (ID, acheteur)" value={filters.q} onChange={set('q')} width={190} />
          <Select label="Statut" value={filters.status} onChange={set('status')} options={STATUS_OPTIONS} />
          <Select label="Fréquence" value={filters.frequency} onChange={set('frequency')} options={FREQUENCY_OPTIONS} />
          <TextField label="Produit" value={filters.product} onChange={set('product')} />
          <TextField label="Région" value={filters.region} onChange={set('region')} />
          <TextField label="Acheteur" value={filters.buyer} onChange={set('buyer')} />
          <TextField label="Début du" type="date" value={filters.starts_from} onChange={set('starts_from')} />
          <TextField label="Début au" type="date" value={filters.starts_to} onChange={set('starts_to')} />
          <TextField label="Prochaine livraison du" type="date" value={filters.next_from} onChange={set('next_from')} />
          <TextField label="Prochaine livraison au" type="date" value={filters.next_to} onChange={set('next_to')} />
        </div>
      </Card>

      <Card title={`Besoins${data ? ` (${data.total})` : ''}`} subtitle="Un clic ouvre la fiche détaillée">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && data.items.length === 0} emptyText="Aucun besoin récurrent ne correspond à ces filtres.">
          {data && (
            <>
              <DataTable<NeedRow>
                rowKey={(r) => r.id}
                onRowClick={(r) => setOpenId(r.id)}
                columns={[
                  { header: 'Besoin', render: (r) => <code style={{ fontSize: 12 }}>{r.short_id}</code> },
                  { header: 'Acheteur', render: (r) => <><b>{r.buyer.name || '—'}</b><div style={{ fontSize: 11, color: C.muted }}>{r.buyer.phone}</div></> },
                  { header: 'Produit', render: (r) => r.product },
                  { header: 'Quantité', align: 'right', render: (r) => fmtQty(r.quantity, r.unit) },
                  { header: 'Fréquence', render: (r) => describeFrequency(r.frequency, r.weekly_days) },
                  { header: 'Statut', render: (r) => <Pill label={NEED_STATUS_LABELS[r.status] ?? r.status} tone={r.status === 'ACTIVE' ? C.emerald : r.status === 'PAUSED' ? C.amber : C.muted} /> },
                  { header: 'Début', render: (r) => fmtDay(r.starts_at) },
                  { header: 'Créé', render: (r) => fmtAgo(r.created_at) },
                  { header: 'Prochaine livraison', render: (r) => fmtDay(r.next_occurrence) },
                  { header: 'Région', render: (r) => r.region ?? <span style={{ color: C.muted }}>—</span> },
                  { header: 'Occ.', align: 'right', render: (r) => r.occurrence_count },
                  { header: 'Sourcing', render: (r) => (r.sourcing_state ? OCCURRENCE_STATUS_LABELS[r.sourcing_state] ?? r.sourcing_state : <span style={{ color: C.muted }}>—</span>) },
                  { header: 'Dernière activité', render: (r) => fmtAgo(r.last_activity) },
                ]}
                rows={data.items}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 12, color: C.muted }}>
                <span>{data.total === 0 ? '' : `${offset + 1}–${Math.min(offset + limit, data.total)} sur ${data.total}`}</span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} style={pagerBtn(offset === 0)}>Précédent</button>
                  <button disabled={offset + limit >= data.total} onClick={() => setOffset(offset + limit)} style={pagerBtn(offset + limit >= data.total)}>Suivant</button>
                </span>
              </div>
            </>
          )}
        </DataState>
      </Card>

      {openId && <NeedDrawer needId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
