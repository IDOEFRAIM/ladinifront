'use client';

import React, { useState } from 'react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { callApi, errorMessage } from './api';
import { RECIPIENT_STATUS_LABELS, STATUS_LABELS, canCancel, canEdit, fmtDateTime } from './format';
import { PreviewPanel } from './PreviewPanel';
import { RecipientsPanel } from './RecipientsPanel';
import { ResultsPanel } from './ResultsPanel';
import { BASE, button } from './styles';
import type { Campaign } from './types';

interface DetailPayload {
  campaign: Campaign;
  recipients_by_status: Record<string, number>;
}

type Tab = 'preview' | 'results' | 'recipients';

export function CampaignDetail({ id, onChanged, onEdit }: { id: string; onChanged: () => void; onEdit: (c: Campaign) => void }) {
  const [tab, setTab] = useState<Tab>('preview');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, error, refetch } = useCockpitData<DetailPayload>(`${BASE}/${id}`, {});
  const campaign = data?.campaign;

  const cancel = async () => {
    if (!window.confirm('Annuler cette campagne ? Les envois non encore partis seront bloqués.')) return;
    setBusy(true);
    setActionError(null);
    try {
      await callApi('POST', `/${id}/cancel`, {});
      refetch();
      onChanged();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataState loading={loading} error={error} hasData={!!campaign} onRetry={refetch}>
      {campaign && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: F.body }} data-testid="campaign-detail">
          <Card
            title={campaign.name}
            subtitle={`${STATUS_LABELS[campaign.status]} · prochain envoi : ${fmtDateTime(campaign.next_run_at ?? campaign.send_at)} · version ${campaign.content_version}`}
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                {canEdit(campaign.status) && <button style={button()} onClick={() => onEdit(campaign)}>Modifier</button>}
                {canCancel(campaign.status) && <button style={button()} disabled={busy} onClick={cancel}>Annuler la campagne</button>}
              </div>
            }
          >
            {campaign.last_error && <div role="alert" style={{ fontSize: 12, color: '#991B1B' }}>Dernière erreur : {campaign.last_error}</div>}
            {actionError && <div role="alert" style={{ fontSize: 12, color: '#991B1B' }}>{actionError}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
              {Object.entries(data?.recipients_by_status ?? {}).map(([k, n]) => (
                <span key={k}>{RECIPIENT_STATUS_LABELS[k] ?? k} : <b>{n}</b></span>
              ))}
            </div>
          </Card>

          <div role="tablist" style={{ display: 'flex', gap: 6 }}>
            {([['preview', 'Aperçu et validation'], ['results', 'Résultats'], ['recipients', 'Destinataires']] as [Tab, string][]).map(([k, lbl]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{ ...button(tab === k) }}>{lbl}</button>
            ))}
          </div>

          {tab === 'preview' && <PreviewPanel campaign={campaign} onValidated={() => { refetch(); onChanged(); }} />}
          {tab === 'results' && <ResultsPanel id={id} />}
          {tab === 'recipients' && <RecipientsPanel id={id} />}
        </div>
      )}
    </DataState>
  );
}
