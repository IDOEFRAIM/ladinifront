'use client';

import React from 'react';
import { C } from '@/features/monitoring/cockpit/ui/primitives';
import { dayKey, dayLabel, fmtClock } from './format';

export interface TimelineMessage {
  role: 'USER' | 'AGENT' | 'COMMERCIAL';
  text: string | null;
  at: string;
  commercial_user_id?: string;
  send_status?: string;
}

const BUBBLE: Record<TimelineMessage['role'], { bg: string; label: string; side: 'left' | 'right' }> = {
  USER: { bg: '#EEF2FF', label: 'Utilisateur', side: 'left' },
  AGENT: { bg: '#ECFDF5', label: 'Agent Ladini', side: 'right' },
  COMMERCIAL: { bg: '#FFF7ED', label: 'Commercial', side: 'right' },
};

export function Thread({ messages, name, endRef }: { messages: TimelineMessage[]; name: string; endRef: React.RefObject<HTMLDivElement | null> }) {
  if (messages.length === 0) {
    return (
      <div data-testid="thread-empty" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 28, textAlign: 'center', color: C.muted, fontSize: 13, background: '#F8FAFC' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: C.forest }}>Aucun échange pour le moment</p>
          <p style={{ margin: '6px 0 0' }}>{name} n&apos;a pas encore parlé à l&apos;agent. Vous pouvez lui envoyer le premier message ci-dessous.</p>
        </div>
      </div>
    );
  }
  const withDay = messages.map((m, i) => ({ m, showDay: i === 0 || dayKey(m.at) !== dayKey(messages[i - 1].at) }));
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {withDay.map(({ m, showDay }, i) => {
        const b = BUBBLE[m.role];
        return (
          <React.Fragment key={i}>
            {showDay && <div style={{ alignSelf: 'center', fontSize: 11, color: C.muted, background: '#E2E8F0', borderRadius: 100, padding: '2px 10px', margin: '6px 0' }}>{dayLabel(m.at)}</div>}
            <div data-testid="timeline-message" style={{ display: 'flex', flexDirection: 'column', alignItems: b.side === 'left' ? 'flex-start' : 'flex-end' }}>
              <div style={{ maxWidth: '82%', background: b.bg, borderRadius: b.side === 'left' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', padding: '8px 12px', boxShadow: '0 1px 1px rgba(15,23,42,0.06)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{b.label}</div>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text || <i style={{ color: C.muted }}>(vide)</i>}</div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                {fmtClock(m.at)}{m.role === 'COMMERCIAL' && m.send_status === 'FAILED' ? ' · échec d’envoi' : ''}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
