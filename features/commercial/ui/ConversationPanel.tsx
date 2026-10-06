'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { DataState, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { StatusPill } from './StatusPill';
import { Thread, type TimelineMessage } from './Thread';
import {
  MAX_MESSAGE_LENGTH, QUICK_REPLIES, STATUS_LABELS,
  fmtAgo, initials, roleLabel,
} from './format';

// ── Contrat exposé par /api/admin/commercial/conversations/{id} ──────────

export interface ConversationDetail {
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

/**
 * Panneau de conversation d'un utilisateur (ouvert depuis la liste, avec ou sans échange préalable) :
 * en-tête identité + statut, fil de messages lisible (bulles, séparateurs de jour), puis zone d'envoi FIXÉE en bas.
 * L'envoi est une relance WhatsApp manuelle (jamais une entrée de l'agent) ; il part par le modèle WhatsApp approuvé,
 * donc il est livré même si l'utilisateur n'a pas écrit depuis plus de 24 h.
 */
export function ConversationPanel({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged?: () => void }) {
  const { data, loading, error, refetch } = useCockpitData<ConversationDetail>(`/api/admin/commercial/conversations/${userId}`, {});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [data?.timeline.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = message.trim();
  const tooLong = message.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !sending;

  async function doSend() {
    setSending(true);
    setSendError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/commercial/conversations/${userId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
      }
      setMessage('');
      setNotice('Message envoyé.');
      refetch();
      onChanged?.();
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
    onChanged?.();
  }

  const displayName = data?.name || data?.phone_masked || 'Utilisateur';

  return (
    <>
      <div onClick={onClose} aria-hidden style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 59 }} />
      <aside role="dialog" aria-modal="true" aria-label={`Conversation avec ${displayName}`} data-testid="commercial-drawer"
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', background: '#fff', boxShadow: '-12px 0 40px rgba(6,78,59,0.18)', zIndex: 60, display: 'flex', flexDirection: 'column', fontFamily: F.body }}>
        <header style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div aria-hidden style={{ width: 42, height: 42, borderRadius: '50%', background: C.forest, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontFamily: F.heading, flexShrink: 0 }}>
            {initials(data?.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: F.heading, fontSize: 17, color: C.forest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>{data ? `${roleLabel(data.role)} · ${data.phone_masked ?? 'sans numéro'}` : '…'}</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ border: 'none', background: 'rgba(6,78,59,0.06)', borderRadius: 100, width: 34, height: 34, cursor: 'pointer', flexShrink: 0 }}><X size={16} /></button>
        </header>

        <DataState loading={loading && !data} error={error} hasData={!!data} onRetry={refetch}>
          {data && (
            <>
              <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#F8FAFC' }}>
                <StatusPill status={data.commercial_status} />
                <label style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Suivi
                  <select aria-label="Statut de suivi" value={data.commercial_status} onChange={(e) => changeStatus(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12 }}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <span style={{ fontSize: 12, color: C.muted }}>Dernière relance : {fmtAgo(data.last_follow_up_at)}</span>
                {data.workspace?.active_goal && (
                  <span style={{ fontSize: 12, color: C.muted }}>
                    Tunnel : {data.workspace.active_goal}{data.workspace.tunnel_locked ? ' (verrouillé)' : ''}
                  </span>
                )}
              </div>

              <Thread messages={data.timeline} name={displayName} endRef={endRef} />

              <footer style={{ borderTop: `1px solid ${C.border}`, padding: '12px 18px 16px', background: '#fff' }}>
                {data.account_status !== 'ACTIVE' && (
                  <p role="alert" style={{ margin: '0 0 8px', fontSize: 12, color: C.amber }}>Compte {data.account_status.toLowerCase()} : l&apos;envoi sera refusé.</p>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {QUICK_REPLIES.map((q, i) => (
                    <button key={i} type="button" onClick={() => { setMessage(q); setConfirming(false); setNotice(null); }}
                      style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '4px 10px', fontSize: 11, color: C.forest, cursor: 'pointer' }}>
                      Suggestion {i + 1}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label="Message de relance"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setConfirming(false); setNotice(null); }}
                  placeholder="Écrire un message à envoyer par WhatsApp…"
                  rows={3}
                  style={{ width: '100%', padding: '9px 11px', borderRadius: 10, border: `1px solid ${tooLong ? C.red : C.border}`, fontFamily: F.body, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: tooLong ? C.red : C.muted, margin: '4px 0 8px' }}>
                  <span>Envoyé via le modèle WhatsApp approuvé : livré même si l&apos;utilisateur n&apos;a pas écrit depuis plus de 24 h.</span>
                  <span>{message.length}/{MAX_MESSAGE_LENGTH}</span>
                </div>
                {sendError && <p role="alert" style={{ color: C.red, fontSize: 12, margin: '0 0 8px' }}>{sendError}</p>}
                {notice && <p role="status" style={{ color: C.emerald, fontSize: 12, fontWeight: 600, margin: '0 0 8px' }}>{notice}</p>}
                {!confirming ? (
                  <button disabled={!canSend} onClick={() => setConfirming(true)}
                    style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '9px 22px', fontWeight: 700, cursor: canSend ? 'pointer' : 'default', opacity: canSend ? 1 : 0.5 }}>
                    Envoyer
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: C.muted }}>Envoyer ce message à {displayName} ?</span>
                    <button onClick={doSend} disabled={sending} style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '7px 16px', fontWeight: 700, cursor: 'pointer' }}>
                      {sending ? 'Envoi…' : 'Confirmer'}
                    </button>
                    <button onClick={() => setConfirming(false)} disabled={sending} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 100, padding: '7px 16px', cursor: 'pointer' }}>Annuler</button>
                  </div>
                )}
              </footer>
            </>
          )}
        </DataState>
      </aside>
    </>
  );
}
