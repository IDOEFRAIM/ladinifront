'use client';

import { useEffect, useRef, useState } from 'react';

export interface LiveTurn {
  id: string;
  conversationId: string;
  at: string;
  maskedPhone: string;
  intent: string | null;
  workflow: string | null;
  outcome: string;
  durationMs: number;
}
export interface LiveSummary { turns5m: number; activeSessions: number; errors5m: number; completed5m: number }
export interface LiveState {
  connected: boolean;
  turns: LiveTurn[];
  summary: LiveSummary | null;
  healthAlert: { from: string; to: string } | null;
}

/** Abonnement SSE au flux temps réel du cockpit. Se reconnecte tout seul (EventSource) ; ferme proprement au démontage. */
export function useLiveFeed(max = 40, url = '/api/admin/monitoring/stream'): LiveState {
  const [state, setState] = useState<LiveState>({ connected: false, turns: [], summary: null, healthAlert: null });
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(url, { withCredentials: true });
    es.onopen = () => setState((s) => ({ ...s, connected: true }));
    es.onerror = () => setState((s) => ({ ...s, connected: false }));
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { type: string; data: unknown };
        if (msg.type === 'turns') {
          const fresh = (msg.data as LiveTurn[]).filter((t) => !seen.current.has(t.id));
          fresh.forEach((t) => seen.current.add(t.id));
          if (fresh.length) setState((s) => ({ ...s, turns: [...fresh.reverse(), ...s.turns].slice(0, max) }));
        } else if (msg.type === 'summary') {
          setState((s) => ({ ...s, summary: msg.data as LiveSummary }));
        } else if (msg.type === 'health') {
          setState((s) => ({ ...s, healthAlert: msg.data as { from: string; to: string } }));
        }
      } catch { /* évènement illisible : ignoré */ }
    };
    return () => es.close();
  }, [url, max]);

  return state;
}
