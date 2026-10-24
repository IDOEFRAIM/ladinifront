'use client';

import React from 'react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Grid, Stat, C } from '@/features/monitoring/cockpit/ui/primitives';
import { RECIPIENT_STATUS_LABELS, fmtRate, skipLabel } from './format';
import { BASE } from './styles';
import type { ResultsPayload } from './types';

export function ResultsPanel({ id }: { id: string }) {
  const { data, loading, error, refetch } = useCockpitData<ResultsPayload>(`${BASE}/${id}/results`, {}, { refreshMs: 30_000 });
  const m = data?.metrics;
  const interests = Object.entries(m?.interests ?? {});
  return (
    <DataState loading={loading} error={error} hasData={!!m} onRetry={refetch}>
      {m && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} data-testid="campaign-results">
          <Grid cols={4}>
            <Stat label="Préparés" value={String(m.prepared)} />
            <Stat label="Acceptés par WhatsApp" value={String(m.accepted)} hint="« envoyé » = accepté par le fournisseur" />
            <Stat label="Livrés" value={String(m.delivered)} hint="seulement si le fournisseur le remonte" />
            <Stat label="Lus" value={String(m.read)} />
            <Stat label="Réponses" value={String(m.replied)} />
            <Stat label="Écartés" value={String(m.skipped)} />
            <Stat label="Échecs" value={String(m.failed)} />
            <Stat label="Désinscriptions après envoi" value={String(m.opt_outs_after_send)} />
          </Grid>
          <Card title="Taux (avec leur dénominateur)">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              <li>Taux de livraison : <b data-testid="delivery-rate">{fmtRate(m.rates.delivery_rate)}</b></li>
              <li>Taux de réponse : <b data-testid="reply-rate">{fmtRate(m.rates.reply_rate)}</b></li>
            </ul>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: C.muted }}>{m.notes}</p>
          </Card>
          <Card title="Intérêts exprimés" subtitle="Un intérêt n’est pas une commande ni une vente.">
            <DataTable columns={[{ header: 'Type', render: ([k]: [string, number]) => k }, { header: 'Nombre', render: ([, n]: [string, number]) => n, align: 'right' as const }]} rows={interests} rowKey={([k]) => k} empty="Aucun intérêt exprimé pour l’instant." />
          </Card>
          <Card title="Échecs et écarts à l’envoi">
            <DataTable
              columns={[
                { header: 'Statut', render: (f: ResultsPayload['failures'][number]) => RECIPIENT_STATUS_LABELS[f.status] ?? f.status },
                { header: 'Raison', render: (f: ResultsPayload['failures'][number]) => skipLabel(f.reason) },
                { header: 'Nombre', render: (f: ResultsPayload['failures'][number]) => f.n, align: 'right' as const },
                { header: 'Numéros (4 derniers chiffres)', render: (f: ResultsPayload['failures'][number]) => f.phone_tails.join(', ') },
              ]}
              rows={data?.failures ?? []}
              rowKey={(f) => `${f.status}-${f.reason}`}
              empty="Aucun échec."
            />
          </Card>
        </div>
      )}
    </DataState>
  );
}
