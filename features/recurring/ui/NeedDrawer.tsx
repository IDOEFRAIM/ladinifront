'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { DataState, DataTable, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import type { NeedDetail, OccurrenceRow } from '../types';
import {
  DIAGNOSTIC_LABELS, NEED_STATUS_LABELS, OCCURRENCE_STATUS_LABELS,
  describeFrequency, fmtAgo, fmtDay, fmtQty,
} from './format';
import { KeyValues, Pill, Section, note } from './parts';

// ── Fiche détaillée ────────────────────────────────────────────────────

export function NeedDrawer({ needId, onClose }: { needId: string; onClose: () => void }) {
  const { data, loading, error, refetch } = useCockpitData<NeedDetail>(`/api/admin/recurring/needs/${needId}`, {});
  return (
    <aside role="dialog" aria-label="Fiche du besoin récurrent" data-testid="recurring-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(860px, 100vw)', background: '#fff', boxShadow: '-12px 0 40px rgba(6,78,59,0.18)', zIndex: 60, overflowY: 'auto', padding: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 18, color: C.forest }}>
            {data ? `${data.overview.product} — ${fmtQty(data.overview.quantity, data.overview.unit)}` : 'Besoin récurrent'}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>{needId}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'rgba(6,78,59,0.06)', borderRadius: 100, width: 32, height: 32, cursor: 'pointer' }}><X size={16} /></button>
      </header>

      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Section title="Aperçu">
              <KeyValues rows={[
                ['Acheteur', `${data.overview.buyer.name ?? '—'}${data.overview.buyer.phone ? ` · ${data.overview.buyer.phone}` : ''}`],
                ['Produit', data.overview.product],
                ['Quantité', fmtQty(data.overview.quantity, data.overview.unit)],
                ['Fréquence', describeFrequency(data.overview.frequency, data.schedule.weekly_days)],
                ['Statut', NEED_STATUS_LABELS[data.overview.status] ?? data.overview.status],
                ['Début', fmtDay(data.overview.starts_at)],
                ['Fin', fmtDay(data.overview.ends_at)],
                ['En pause jusqu\'au', fmtDay(data.overview.paused_until)],
                ['Prix max par unité', data.overview.max_price_per_unit === null ? '—' : `${data.overview.max_price_per_unit} FCFA`],
                ['Région', data.overview.region ?? '—'],
                ['Créé', fmtDay(data.overview.created_at)],
                ['Dernière mise à jour', fmtAgo(data.overview.updated_at)],
              ]} />
            </Section>

            <Section title="Planning">
              <KeyValues rows={[
                ['Date de début retenue', fmtDay(data.schedule.effective_start_date)],
                ['Première livraison', fmtDay(data.schedule.first_delivery_date)],
                ['Prochaine échéance calculée', fmtDay(data.schedule.next_calculated_occurrence)],
                ['Prochaine échéance matérialisée', fmtDay(data.schedule.next_materialized_occurrence)],
                ['Délai minimum (réglage actuel)', `${data.schedule.lead_time_policy.current_minimum_start_lead_days} j`],
              ]} />
              <p style={note}>{data.schedule.lead_time_policy.note}</p>
            </Section>

            <Section title={`Occurrences (${data.occurrences.length})`}>
              {data.occurrences.length === 0 ? <p style={note}>Aucune occurrence matérialisée.</p> : <OccurrenceList items={data.occurrences} />}
            </Section>

            <Section title={`Commandes (${data.orders.length})`}>
              {data.orders.length === 0 ? <p style={note}>Aucune commande issue de ce besoin.</p> : (
                <DataTable
                  rowKey={(o) => o.id}
                  columns={[
                    { header: 'Commande', render: (o) => <code style={{ fontSize: 12 }}>{o.id.slice(0, 8)}</code> },
                    { header: 'Livraison', render: (o) => fmtDay(o.occurrence_date) },
                    { header: 'Montant', align: 'right', render: (o) => (o.total_amount === null ? '—' : `${o.total_amount} FCFA`) },
                    { header: 'Statut', render: (o) => o.status },
                    { header: 'Paiement', render: (o) => o.payment_status },
                    { header: 'Livraison (statut)', render: (o) => o.delivery_status },
                    { header: 'Annulée par', render: (o) => o.cancellation_role ?? '—' },
                  ]}
                  rows={data.orders}
                />
              )}
            </Section>

            <Section title="Historique des modifications">
              {data.mutations.available ? <p style={note}>Disponible.</p> : (
                <p style={note} data-testid="mutations-unavailable">
                  Non disponible : {data.mutations.reason} (version courante du besoin : {data.mutations.need_version ?? '—'}).
                </p>
              )}
            </Section>

            <Section title="État opérationnel">
              <p style={{ margin: '0 0 8px', fontSize: 13 }}>
                Prochaine livraison : <b>{data.operational_state.sourcing_state ? OCCURRENCE_STATUS_LABELS[data.operational_state.sourcing_state] ?? data.operational_state.sourcing_state : '—'}</b>
              </p>
              {data.operational_state.diagnostics.length === 0 ? <p style={note}>Aucun incident (refus, expiration, annulation) détecté.</p> : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
                  {data.operational_state.diagnostics.map((d, i) => (
                    <li key={i}>
                      <b>{DIAGNOSTIC_LABELS[d.kind] ?? d.kind}</b>
                      {d.producer ? ` — ${d.producer}` : ''}{d.date ? ` — ${fmtDay(d.date)}` : ''}{d.by ? ` (par ${d.by})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}
      </DataState>
    </aside>
  );
}

function OccurrenceList({ items }: { items: OccurrenceRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((o) => (
        <div key={o.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr 0.6fr', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px', background: open === o.id ? 'rgba(6,78,59,0.05)' : '#fff', border: 'none', cursor: 'pointer', fontFamily: F.body, fontSize: 13, alignItems: 'center' }}>
            <b>{fmtDay(o.date)}</b>
            <Pill label={OCCURRENCE_STATUS_LABELS[o.status] ?? o.status} tone={o.skipped ? C.muted : C.forest} />
            <span style={{ color: C.muted }}>
              demandé {fmtQty(o.requested_quantity, o.unit)} · trouvé {fmtQty(o.quantity_matched)} · confirmé {fmtQty(o.quantity_confirmed)} · livré {fmtQty(o.quantity_delivered)}
              {o.quantity_overridden ? ' · quantité modifiée' : ''}
            </span>
            <span style={{ color: C.muted, textAlign: 'right' }}>v{o.version}</span>
          </button>
          {open === o.id && (
            <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${C.border}` }}>
              {o.allocations.length === 0 ? <p style={note}>Aucune allocation producteur.</p> : (
                <DataTable
                  rowKey={(a) => a.id}
                  columns={[
                    { header: 'Producteur', render: (a) => a.producer ?? a.producer_id.slice(0, 8) },
                    { header: 'Quantité', align: 'right', render: (a) => fmtQty(a.quantity, a.unit) },
                    { header: 'Prix unitaire', align: 'right', render: (a) => (a.unit_price === null ? '—' : `${a.unit_price} FCFA`) },
                    { header: 'Statut', render: (a) => a.status },
                    { header: 'Convertie en commande', render: (a) => (a.converted ? 'oui' : 'non') },
                    { header: 'Créée', render: (a) => fmtAgo(a.created_at) },
                  ]}
                  rows={o.allocations}
                />
              )}
              <p style={{ ...note, marginTop: 8 }}>
                {o.expires_at ? `Expire ${fmtDay(o.expires_at)}. ` : ''}{o.order_group_id ? `Groupe de commandes ${o.order_group_id.slice(0, 8)}.` : 'Aucune commande créée.'}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

