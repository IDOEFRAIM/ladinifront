'use client';

import React, { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Select, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { CampaignDetail } from './CampaignDetail';
import { CampaignForm } from './CampaignForm';
import { ConsentsPanel } from './ConsentsPanel';
import { STATUS_LABELS, fmtDateTime } from './format';
import type { Campaign, CampaignList } from './types';

const STATUS_FILTERS = [{ value: '', label: 'Tous les statuts' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))];

type View = { kind: 'list' } | { kind: 'new' } | { kind: 'edit'; campaign: Campaign } | { kind: 'detail'; id: string };

/**
 * Console des campagnes de disponibilités (diffusion proactive WhatsApp). Miroir de /internal/availability-campaigns :
 * créer un brouillon, prévisualiser (offres retenues ET exclues avec raisons, message exact, taille d’audience), valider,
 * annuler, suivre les résultats (taux avec dénominateur) et gérer les consentements.
 */
export function CampaignsPage() {
  const [tab, setTab] = useState<'campaigns' | 'consents'>('campaigns');
  const [view, setView] = useState<View>({ kind: 'list' });
  const [status, setStatus] = useState('');
  const { data, loading, error, refetch } = useCockpitData<CampaignList>('/api/admin/availability-campaigns', { status, limit: 50 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F.body }}>
      <div>
        <h1 style={{ fontFamily: F.heading, fontSize: 22, color: C.forest, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={22} /> Campagnes de disponibilités
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
          Diffusion proactive sur WhatsApp, à partir des offres réellement disponibles. Seuls les contacts qui ont consenti la reçoivent.
        </p>
      </div>

      <div role="tablist" style={{ display: 'flex', gap: 6 }}>
        {([['campaigns', 'Campagnes'], ['consents', 'Consentements']] as const).map(([k, lbl]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            style={{ border: tab === k ? 'none' : `1px solid ${C.border}`, background: tab === k ? C.forest : '#fff', color: tab === k ? '#fff' : C.text, borderRadius: 100, padding: '7px 16px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'consents' && <ConsentsPanel />}

      {tab === 'campaigns' && view.kind === 'list' && (
        <Card
          title="Campagnes"
          right={<button onClick={() => setView({ kind: 'new' })} style={{ border: 'none', background: C.forest, color: '#fff', borderRadius: 100, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' }}>Nouvelle campagne</button>}
        >
          <div style={{ maxWidth: 260, marginBottom: 12 }}><Select label="Statut" value={status} onChange={setStatus} options={STATUS_FILTERS} /></div>
          <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
            <DataTable<Campaign>
              columns={[
                { header: 'Nom', render: (c) => <b>{c.name}</b> },
                { header: 'Statut', render: (c) => STATUS_LABELS[c.status] },
                { header: 'Fréquence', render: (c) => (c.frequency === 'ONCE' ? 'Une fois' : c.frequency === 'WEEKLY' ? 'Hebdomadaire' : `Tous les ${c.interval_days} jours`) },
                { header: 'Prochain envoi', render: (c) => fmtDateTime(c.next_run_at ?? c.send_at) },
                { header: 'Version', render: (c) => c.content_version, align: 'right' },
              ]}
              rows={data?.items ?? []}
              rowKey={(c) => c.id}
              onRowClick={(c) => setView({ kind: 'detail', id: c.id })}
              empty="Aucune campagne. Créez un brouillon pour commencer."
            />
          </DataState>
        </Card>
      )}

      {tab === 'campaigns' && view.kind === 'new' && (
        <Card title="Nouvelle campagne (brouillon)">
          <CampaignForm onCancel={() => setView({ kind: 'list' })} onSaved={(c) => { refetch(); setView({ kind: 'detail', id: c.id }); }} />
        </Card>
      )}

      {tab === 'campaigns' && view.kind === 'edit' && (
        <Card title={`Modifier « ${view.campaign.name} »`}>
          <CampaignForm campaign={view.campaign} onCancel={() => setView({ kind: 'detail', id: view.campaign.id })} onSaved={(c) => { refetch(); setView({ kind: 'detail', id: c.id }); }} />
        </Card>
      )}

      {tab === 'campaigns' && view.kind === 'detail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => { setView({ kind: 'list' }); refetch(); }} style={{ alignSelf: 'flex-start', border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
            ← Toutes les campagnes
          </button>
          <CampaignDetail key={view.id} id={view.id} onChanged={refetch} onEdit={(c) => setView({ kind: 'edit', campaign: c })} />
        </div>
      )}
    </div>
  );
}
