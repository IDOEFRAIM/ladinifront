'use client';

import React, { useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Select, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { ConversationPanel } from './ConversationPanel';
import { StatusPill } from './StatusPill';
import { fmtAgo, roleLabel } from './format';

// ── Contrat exposé par /api/admin/commercial/* (miroir de /internal/commercial/* — services/commercial/admin_api.py) ──

interface ConversationRow {
  user_id: string;
  name: string | null;
  phone_masked: string | null;
  role: string | null;
  turns: number;
  last_activity: string | null;
  last_intent: string | null;
  commercial_status: string;
  assigned_commercial_id: string | null;
  last_follow_up_at: string | null;
  is_long: boolean;
  is_no_response: boolean;
}

interface ListPayload {
  items: ConversationRow[];
  total: number;
  limit: number;
  offset: number;
}

const FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'to_follow_up', label: 'À relancer' },
  { value: 'long', label: 'Longues conversations' },
  { value: 'no_response', label: 'Sans réponse' },
  { value: 'followed_up', label: 'Relancés' },
  { value: 'resolved', label: 'Résolus' },
];

const ROLES = [
  { value: '', label: 'Tous les rôles' },
  { value: 'PRODUCER', label: 'Producteurs' },
  { value: 'BUYER', label: 'Acheteurs' },
  { value: 'ADMIN', label: 'Admins' },
];

const SORTS = [
  { value: 'recent', label: 'Activité récente' },
  { value: 'oldest_no_response', label: 'Plus anciennes sans réponse' },
  { value: 'longest', label: 'Plus longues' },
];

/**
 * Espace COMMERCIAL — TOUS les utilisateurs joignables (numéro WhatsApp renseigné), avec ou sans échange préalable avec
 * l'agent : on peut chercher quelqu'un, ouvrir sa conversation et lui envoyer une relance manuelle.
 */
export function CommercialPage() {
  const [filter, setFilter] = useState('all');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = 25;

  const { data, loading, error, refetch } = useCockpitData<ListPayload>('/api/admin/commercial/conversations', {
    filter, sort, role, q: search.trim(), limit, offset,
  });

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setOffset(0); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F.body }}>
      <div>
        <h1 style={{ fontFamily: F.heading, fontSize: 22, color: C.forest, margin: 0 }}>Contacts & relances</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
          Tous les utilisateurs ayant un numéro WhatsApp, même sans conversation avec l&apos;agent.
        </p>
      </div>

      <Card title="Rechercher" testId="commercial-filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nom ou numéro
            <span style={{ position: 'relative', display: 'block' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: C.muted }} />
              <input
                type="search"
                value={search}
                onChange={(e) => reset(setSearch)(e.target.value)}
                placeholder="ex : Awa, +226…"
                aria-label="Rechercher un utilisateur"
                style={{ width: 230, padding: '7px 10px 7px 30px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: F.body, textTransform: 'none', letterSpacing: 0 }}
              />
            </span>
          </label>
          <Select label="Rôle" value={role} onChange={reset(setRole)} options={ROLES} />
          <Select label="Suivi" value={filter} onChange={reset(setFilter)} options={FILTERS} />
          <Select label="Tri" value={sort} onChange={reset(setSort)} options={SORTS} />
        </div>
      </Card>

      <Card title={`Utilisateurs${data ? ` (${data.total})` : ''}`} subtitle="Un clic ouvre la conversation et permet d'envoyer un message">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && data.items.length === 0} emptyText="Aucun utilisateur ne correspond à cette recherche.">
          {data && (
            <>
              <DataTable<ConversationRow>
                rowKey={(r) => r.user_id}
                onRowClick={(r) => setOpenId(r.user_id)}
                columns={[
                  { header: 'Utilisateur', render: (r) => <><b>{r.name || r.phone_masked || '—'}</b><div style={{ fontSize: 11, color: C.muted }}>{r.phone_masked}</div></> },
                  { header: 'Rôle', render: (r) => roleLabel(r.role) },
                  { header: 'Dernière activité', render: (r) => (r.last_activity ? fmtAgo(r.last_activity) : <span style={{ color: C.muted }}>Jamais écrit</span>) },
                  { header: 'Tours', align: 'right', render: (r) => r.turns },
                  { header: 'Dernier intent', render: (r) => <span style={{ color: C.muted }}>{r.last_intent ?? '—'}</span> },
                  { header: 'Statut', render: (r) => <StatusPill status={r.commercial_status} /> },
                  { header: 'Dernière relance', render: (r) => fmtAgo(r.last_follow_up_at) },
                  {
                    header: '',
                    render: (r) => (
                      <button onClick={(e) => { e.stopPropagation(); setOpenId(r.user_id); }} aria-label={`Contacter ${r.name || r.phone_masked || 'cet utilisateur'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '4px 12px', color: C.forest, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        <MessageCircle size={13} /> Contacter
                      </button>
                    ),
                  },
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

      {openId && <ConversationPanel userId={openId} onClose={() => setOpenId(null)} onChanged={refetch} />}
    </div>
  );
}

const pagerBtn = (disabled: boolean): React.CSSProperties => ({ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 600 });
