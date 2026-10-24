'use client';

import React, { useState } from 'react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Select } from '@/features/monitoring/cockpit/ui/primitives';
import { RECIPIENT_STATUS_LABELS, fmtDateTime, skipLabel } from './format';
import { BASE } from './styles';
import type { RecipientRow, RecipientsPayload } from './types';

const RECIPIENT_FILTERS = [{ value: '', label: 'Tous les statuts' }, ...Object.entries(RECIPIENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))];

export function RecipientsPanel({ id }: { id: string }) {
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useCockpitData<RecipientsPayload>(`${BASE}/${id}/recipients`, { status, limit: 100 });
  return (
    <Card title="Suivi par destinataire" subtitle="Numéros masqués. Chaque destinataire est suivi indépendamment.">
      <div style={{ marginBottom: 10, maxWidth: 260 }}><Select label="Statut" value={status} onChange={setStatus} options={RECIPIENT_FILTERS} /></div>
      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        <DataTable
          columns={[
            { header: 'Numéro', render: (r: RecipientRow) => `••• ${r.phone_tail}` },
            { header: 'Statut', render: (r: RecipientRow) => RECIPIENT_STATUS_LABELS[r.status] ?? r.status },
            { header: 'Détail', render: (r: RecipientRow) => skipLabel(r.skip_reason ?? r.last_error) },
            { header: 'Accepté', render: (r: RecipientRow) => fmtDateTime(r.sent_at) },
            { header: 'Livré', render: (r: RecipientRow) => fmtDateTime(r.delivered_at) },
            { header: 'Lu', render: (r: RecipientRow) => fmtDateTime(r.read_at) },
            { header: 'Réponse', render: (r: RecipientRow) => fmtDateTime(r.replied_at) },
          ]}
          rows={data?.items ?? []}
          rowKey={(r) => r.id}
          empty="Aucun destinataire pour ce filtre."
        />
      </DataState>
    </Card>
  );
}
