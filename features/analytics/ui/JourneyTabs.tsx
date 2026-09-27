'use client';

import React from 'react';
import { C, Card, DataState } from '@/features/monitoring/cockpit/ui/primitives';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import type { JourneyResponse, MetricPayload, NotAvailable } from '../types';
import { MetricCardFromPayload } from './MetricCard';

type Spec = { name: string; label: string };

const DIRECT: Spec[] = [
  { name: 'direct_searches', label: 'Recherches' }, { name: 'direct_successful_searches', label: 'Recherches réussies' },
  { name: 'direct_search_success_rate', label: 'Taux de réussite des recherches' }, { name: 'direct_orders_created', label: 'Commandes créées' },
  { name: 'direct_orders_per_search', label: 'Commandes par recherche' }, { name: 'direct_orders_confirmed', label: 'Commandes confirmées' },
  { name: 'direct_orders_delivered', label: 'Commandes livrées' }, { name: 'direct_fulfillment_rate', label: 'Taux d’exécution (livré / confirmé)' },
  { name: 'direct_gmv', label: 'GMV direct (confirmé)' },
];
const TENDER: Spec[] = [
  { name: 'tenders_created', label: 'Appels d’offres créés' }, { name: 'tenders_with_bid', label: 'Avec au moins une offre' },
  { name: 'tender_response_rate', label: 'Taux de réponse' }, { name: 'average_bids_per_tender', label: 'Offres par appel d’offres' },
  { name: 'time_to_first_bid', label: 'Délai avant 1re offre' }, { name: 'tender_winner_rate', label: 'Taux avec gagnant' },
  { name: 'tender_orders_created', label: 'Commandes créées' }, { name: 'tender_fulfillment_rate', label: 'Taux d’exécution' },
  { name: 'tender_gmv', label: 'GMV appels d’offres' },
];
const RECURRING: Spec[] = [
  { name: 'recurring_occurrences', label: 'Occurrences' }, { name: 'recurring_requested_quantity', label: 'Quantité demandée' },
  { name: 'recurring_matched_quantity', label: 'Quantité appariée' }, { name: 'recurring_confirmed_quantity', label: 'Quantité confirmée' },
  { name: 'recurring_delivered_quantity', label: 'Quantité reçue' }, { name: 'recurring_coverage_rate', label: 'Couverture' },
  { name: 'recurring_full_coverage_rate', label: 'Couverture complète' }, { name: 'recurring_acceptance_rate', label: 'Acceptation' },
  { name: 'recurring_skip_rate', label: 'Occurrences sautées' }, { name: 'recurring_received_occurrence_rate', label: 'Occurrences reçues' },
  { name: 'recurring_fulfillment_rate', label: 'Taux d’exécution (reçu / confirmé)' }, { name: 'recurring_unmatched_quantity', label: 'Demande non appariée' },
];

const ENDPOINT = { direct: 'direct', tenders: 'tenders', recurring: 'recurring' } as const;
const SPECS = { direct: DIRECT, tenders: TENDER, recurring: RECURRING } as const;
export const TAB_LABELS = { direct: 'DIRECT', tenders: 'APPELS D’OFFRES', recurring: 'RÉCURRENT' } as const;

function NotYetAvailable({ items }: { items: NotAvailable[] }) {
  if (items.length === 0) return null;
  return (
    <details data-testid="not-available" style={{ marginTop: 12, fontSize: 12, color: C.muted }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Métriques pas encore disponibles ({items.length})</summary>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
        {items.map((n) => <li key={n.metric_name}><b>{n.label}</b> — {n.reason}</li>)}
      </ul>
    </details>
  );
}

/** Onglet d'un journey : les cartes viennent toutes de l'API (aucun calcul), les métriques indisponibles sont listées à part. */
export function JourneyTab({ tab, params }: { tab: keyof typeof ENDPOINT; params: Record<string, string> }) {
  const { data, error, loading, refetch } = useCockpitData<JourneyResponse>(`/api/admin/analytics/buyers/${ENDPOINT[tab]}`, params);
  const specs = SPECS[tab];
  const metrics = (name: string): MetricPayload | undefined => data?.metrics[name];
  return (
    <Card testId={`tab-${tab}`}>
      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {specs.map((s) => {
                const m = metrics(s.name);
                return m ? <MetricCardFromPayload key={s.name} metric={m} label={s.label} /> : null;
              })}
            </div>
            {(data.notes ?? []).map((n) => <p key={n} style={{ margin: '10px 0 0', fontSize: 12, color: C.muted }}>{n}</p>)}
            <NotYetAvailable items={data.not_available ?? []} />
          </>
        )}
      </DataState>
    </Card>
  );
}
