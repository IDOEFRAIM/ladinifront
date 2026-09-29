'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, DataTable, Select, C, F } from '@/features/monitoring/cockpit/ui/primitives';

// ── Types (contrat exposé par /api/admin/commercial/*, miroir de
// /internal/commercial/* côté backend — voir services/commercial/admin_api.py) ──

interface ConversationRow {
  user_id: string;
  name: string | null;
  phone_masked: string | null;
  role: string | null;
  turns: number;
  last_activity: string | null;
  needs_follow_up: boolean;
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

interface TimelineMessage {
  role: 'USER' | 'AGENT' | 'COMMERCIAL';
  text: string | null;
  at: string;
  commercial_user_id?: string;
  send_status?: string;
}

interface ConversationDetail {
  user_id: string;
  name: string | null;
  phone_masked: string | null;
  role: string | null;
  account_status: string;
  commercial_status: string;
  assigned_commercial_id: string | null;
  last_follow_up_at: string | null;
  workspace: { active_goal: string; active_form: string | null; tunnel_locked: boolean } | null;
  timeline: TimelineMessage[];
}

const STATUS_LABELS: Record<string, string> = {
  NONE: 'Aucun suivi',
  TO_FOLLOW_UP: 'À relancer',
  FOLLOWED_UP: 'Relancé',
  RESOLVED: 'Résolu',
  NOT_INTERESTED: 'Pas intéressé',
};

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'to_follow_up', label: 'À relancer' },
  { value: 'long', label: 'Longues' },
  { value: 'no_response', label: 'Sans réponse' },
  { value: 'followed_up', label: 'Relancées' },
  { value: 'resolved', label: 'Résolues' },
];

const SORTS: { value: string; label: string }[] = [
  { value: 'recent', label: 'Activité récente' },
  { value: 'oldest_no_response', label: 'Plus anciennes sans réponse' },
  { value: 'longest', label: 'Plus longues' },
];

function fmtAgo(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export function CommercialPage() {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const limit = 25;

  const { data, loading, error, refetch } = useCockpitData<ListPayload>('/api/admin/commercial/conversations', {
    filter, sort, limit, offset,
  });

  const reset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setOffset(0); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F.body }}>
      <h1 style={{ fontFamily: F.heading, fontSize: 22, color: C.forest, margin: 0 }}>Relances commerciales</h1>

      <Card title="Filtres" testId="commercial-filters">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Select label="Filtre" value={filter} onChange={reset(setFilter)} options={FILTERS} />
          <Select label="Tri" value={sort} onChange={reset(setSort)} options={SORTS} />
        </div>
      </Card>

      <Card title={`Conversations${data ? ` (${data.total})` : ''}`} subtitle="Un clic ouvre l'historique et permet d'envoyer une relance">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch} empty={!!data && data.items.length === 0} emptyText="Aucune conversation ne correspond à ces filtres.">
          {data && (
            <>
              <DataTable<ConversationRow>
                rowKey={(r) => r.user_id}
                onRowClick={(r) => setOpenId(r.user_id)}
                columns={[
                  { header: 'Utilisateur', render: (r) => <><b>{r.name || r.phone_masked || '—'}</b><div style={{ fontSize: 11, color: C.muted }}>{r.phone_masked}</div></> },
                  { header: 'Rôle', render: (r) => (r.role === 'PRODUCER' ? 'Producteur' : r.role === 'BUYER' ? 'Acheteur' : r.role ?? '—') },
                  { header: 'Dernière activité', render: (r) => fmtAgo(r.last_activity) },
                  { header: 'Tours', align: 'right', render: (r) => r.turns },
                  { header: 'Dernier intent', render: (r) => <span style={{ color: C.muted }}>{r.last_intent ?? '—'}</span> },
                  { header: 'Statut commercial', render: (r) => <StatusPill status={r.commercial_status} /> },
                  { header: 'Dernière relance', render: (r) => fmtAgo(r.last_follow_up_at) },
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

      {openId && <ConversationDrawer userId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NONE: C.muted,
    TO_FOLLOW_UP: C.amber,
    FOLLOWED_UP: C.blue,
    RESOLVED: C.emerald,
    NOT_INTERESTED: C.red,
  };
  const color = colors[status] ?? C.muted;
  return (
    <span style={{ color, fontWeight: 700, fontSize: 12, border: `1px solid ${color}`, borderRadius: 100, padding: '2px 10px' }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

const pagerBtn = (disabled: boolean): React.CSSProperties => ({ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 600 });

const ROLE_STYLE: Record<TimelineMessage['role'], { bg: string; label: string; align: 'flex-start' | 'flex-end' }> = {
  USER: { bg: 'rgba(29,78,216,0.08)', label: 'UTILISATEUR', align: 'flex-start' },
  AGENT: { bg: 'rgba(6,78,59,0.06)', label: 'AGENT', align: 'flex-end' },
  COMMERCIAL: { bg: 'rgba(217,119,6,0.12)', label: 'COMMERCIAL', align: 'flex-end' },
};

function ConversationDrawer({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data, loading, error, refetch } = useCockpitData<ConversationDetail>(`/api/admin/commercial/conversations/${userId}`, {});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function doSend() {
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/admin/commercial/conversations/${userId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
      }
      setMessage('');
      refetch();
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  async function changeStatus(status: string) {
    await fetch(`/api/admin/commercial/conversations/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ status }),
    });
    refetch();
  }

  return (
    <aside role="dialog" aria-label="Détail de la conversation" data-testid="commercial-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(680px, 100vw)', background: '#fff', boxShadow: '-12px 0 40px rgba(6,78,59,0.18)', zIndex: 60, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 18, color: C.forest }}>{data?.name || data?.phone_masked || 'Conversation'}</h2>
          {data && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>{data.phone_masked} · {data.role ?? 'rôle inconnu'}</p>}
        </div>
        <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'rgba(6,78,59,0.06)', borderRadius: 100, width: 32, height: 32, cursor: 'pointer' }}><X size={16} /></button>
      </header>

      <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
        {data && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
              <StatusPill status={data.commercial_status} />
              {data.workspace && (
                <span style={{ fontSize: 12, color: C.muted }}>
                  Tunnel : {data.workspace.active_goal || '—'}{data.workspace.active_form ? ` (${data.workspace.active_form})` : ''}{data.workspace.tunnel_locked ? ' · verrouillé' : ''}
                </span>
              )}
              <Select
                label="Statut de suivi"
                value={data.commercial_status}
                onChange={changeStatus}
                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {data.timeline.map((m, i) => {
                const st = ROLE_STYLE[m.role];
                return (
                  <div key={i} data-testid="timeline-message" style={{ display: 'flex', flexDirection: 'column', alignItems: st.align }}>
                    <div style={{ maxWidth: '80%', background: st.bg, borderRadius: 10, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: C.muted, marginBottom: 3 }}>{st.label}</div>
                      <div style={{ fontSize: 13 }}>{m.text || <i style={{ color: C.muted }}>(vide)</i>}</div>
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{fmtAgo(m.at)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relancer cet utilisateur</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bonjour, avez-vous toujours besoin d'aide ?"
                rows={3}
                style={{ width: '100%', marginTop: 6, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: F.body, fontSize: 13, resize: 'vertical' }}
              />
              {sendError && <p style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{sendError}</p>}
              {!confirming ? (
                <button
                  disabled={!message.trim() || sending}
                  onClick={() => setConfirming(true)}
                  style={{ marginTop: 8, background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '8px 18px', fontWeight: 700, cursor: message.trim() ? 'pointer' : 'default', opacity: message.trim() ? 1 : 0.5 }}
                >
                  Envoyer
                </button>
              ) : (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Envoyer ce message via WhatsApp au numéro de {data.name || data.phone_masked} ?</span>
                  <button onClick={doSend} disabled={sending} style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}>
                    {sending ? 'Envoi…' : 'Confirmer'}
                  </button>
                  <button onClick={() => setConfirming(false)} disabled={sending} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 100, padding: '6px 14px', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </DataState>
    </aside>
  );
}
