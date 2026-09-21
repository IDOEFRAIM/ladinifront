'use client';

import React from 'react';
import { Radio } from 'lucide-react';
import { Card, StatusBadge, C } from './primitives';
import { fmtMs, fmtTime, workflowLabel } from './format';
import { useLiveFeed, type LiveTurn } from './useLiveFeed';

const OUTCOME_STATUS: Record<string, string> = { ERROR: 'ERROR', BLOCKED: 'BLOCKED', HUMAN_REQUIRED: 'HUMAN_REQUIRED', CLARIFICATION: 'CLARIFICATION', WAITING_USER: 'WAITING_USER', COMPLETED: 'COMPLETED', FALLBACK: 'ERROR' };

/** Mode temps réel de la Vue d'ensemble : nouveaux tours, erreurs, sessions actives, workflows terminés, alertes santé. */
export function LiveFeed({ onOpenConversation }: { onOpenConversation: (id: string) => void }) {
  const { connected, turns, summary, healthAlert } = useLiveFeed(40);
  return (
    <Card title="Temps réel" subtitle="Flux des derniers tours (rafraîchi toutes les 5 s)" testId="live-feed"
      right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: connected ? '#047857' : C.muted }}><Radio size={14} /> {connected ? 'Connecté' : 'Connexion…'}</span>}>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: C.muted }}>
        <span>Tours 5 min : <b style={{ color: C.forest }}>{summary?.turns5m ?? '—'}</b></span>
        <span>Sessions actives : <b style={{ color: C.forest }}>{summary?.activeSessions ?? '—'}</b></span>
        <span>Erreurs 5 min : <b style={{ color: (summary?.errors5m ?? 0) > 0 ? C.red : C.forest }}>{summary?.errors5m ?? '—'}</b></span>
        <span>Workflows terminés 5 min : <b style={{ color: C.forest }}>{summary?.completed5m ?? '—'}</b></span>
      </div>
      {healthAlert && <div role="alert" data-testid="live-health-alert" style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.08)', color: '#991B1B', fontSize: 12, fontWeight: 700 }}>Santé : {healthAlert.from} → {healthAlert.to}</div>}
      {turns.length === 0 ? (
        <p data-testid="live-empty" style={{ fontSize: 13, color: C.muted }}>En attente de nouveaux tours…</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {turns.map((t: LiveTurn) => (
            <li key={t.id}>
              <button onClick={() => onOpenConversation(t.conversationId)} style={{ display: 'grid', gridTemplateColumns: '64px 110px 1fr auto auto', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left', border: 'none', background: 'rgba(6,78,59,0.03)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                <span style={{ color: C.muted }}>{fmtTime(t.at)}</span>
                <span style={{ color: C.muted }}>{t.maskedPhone}</span>
                <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workflowLabel(t.workflow ?? t.intent)}</span>
                <StatusBadge status={OUTCOME_STATUS[t.outcome] ?? 'COMPLETED'} />
                <span style={{ color: C.forest, fontWeight: 700 }}>{fmtMs(t.durationMs)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
