'use client';

import React, { useState } from 'react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Grid, Stat, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { ApiError, callApi, errorMessage } from './api';
import { canValidate, exclusionLabel, fmtDateTime, skipLabel } from './format';
import { BASE, button } from './styles';
import type { Campaign, ExcludedOffer, OfferSnapshot, PreviewPayload } from './types';

export function PreviewPanel({ campaign, onValidated }: { campaign: Campaign; onValidated: () => void }) {
  const { data, loading, error, refetch } = useCockpitData<PreviewPayload>(`${BASE}/${campaign.id}/preview`, {});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const validate = async () => {
    if (!data?.content_hash) return;
    setBusy(true);
    setMessage(null);
    try {
      await callApi('POST', `/${campaign.id}/validate`, { content_hash: data.content_hash });
      setMessage({ kind: 'ok', text: 'Campagne validée et programmée.' });
      onValidated();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setMessage({ kind: 'error', text: `${e.message} Rechargez l’aperçu, relisez le message, puis validez de nouveau.` });
        refetch();
      } else {
        setMessage({ kind: 'error', text: errorMessage(e) });
      }
    } finally {
      setBusy(false);
    }
  };

  const offerColumns = [
    { header: 'Produit', render: (o: OfferSnapshot) => o.name },
    { header: 'Quantité', render: (o: OfferSnapshot) => (o.quantity === null ? '—' : `${o.quantity} ${o.unit}`) },
    { header: 'Prix', render: (o: OfferSnapshot) => o.price_label ?? 'à confirmer' },
    { header: 'Région', render: (o: OfferSnapshot) => o.region ?? '—' },
    { header: 'Dernière mise à jour', render: (o: OfferSnapshot) => fmtDateTime(o.seen_at) },
  ];
  const excludedColumns = [
    { header: 'Produit', render: (o: ExcludedOffer) => o.name },
    { header: 'Raison(s)', render: (o: ExcludedOffer) => o.reasons.map(exclusionLabel).join(' · ') },
  ];

  return (
    <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Message exact envoyé" subtitle="Construit uniquement à partir des offres éligibles ci-dessous. Rien n’est inventé.">
            {data.message ? (
              <pre data-testid="campaign-message" style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: F.body, fontSize: 13, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>{data.message}</pre>
            ) : (
              <div role="status" style={{ fontSize: 13, color: '#92400E' }}>Aucune offre éligible : il n’y a rien à diffuser. Aucun message ne sera préparé.</div>
            )}
          </Card>
          <Grid cols={3}>
            <Stat label="Destinataires éligibles" value={String(data.audience.recipients)} hint="Consentement + compte actif + ciblage" testId="audience-size" />
            <Stat label="Offres retenues" value={String(data.offers.length)} />
            <Stat label="Offres exclues" value={String(data.excluded.length)} />
          </Grid>
          {Object.keys(data.audience.skipped).length > 0 && (
            <Card title="Contacts écartés du ciblage">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {Object.entries(data.audience.skipped).map(([reason, n]) => <li key={reason}>{skipLabel(reason)} : <b>{n}</b></li>)}
              </ul>
            </Card>
          )}
          <Card title="Offres retenues">
            <DataTable columns={offerColumns} rows={data.offers} rowKey={(o) => o.product_id} empty="Aucune offre retenue." />
          </Card>
          <Card title="Offres exclues et pourquoi" subtitle="Une offre non vérifiable ou périmée n’est jamais présentée comme disponible.">
            <DataTable columns={excludedColumns} rows={data.excluded} rowKey={(o) => `${o.product_id}-${o.reasons.join()}`} empty="Aucune offre exclue." />
          </Card>
          {canValidate(campaign.status) && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={button(true)} disabled={busy || !data.content_hash || data.audience.recipients === 0} onClick={validate} data-testid="validate-button">
                {busy ? 'Validation…' : 'Valider et programmer'}
              </button>
              <button style={button()} onClick={refetch}>Recharger l’aperçu</button>
              <span style={{ fontSize: 11, color: C.muted }}>La validation est refusée si le contenu a changé depuis cet aperçu.</span>
            </div>
          )}
          {message && <div role={message.kind === 'error' ? 'alert' : 'status'} style={{ fontSize: 12, color: message.kind === 'error' ? '#991B1B' : '#065F46' }}>{message.text}</div>}
        </div>
      )}
    </DataState>
  );
}
