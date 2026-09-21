'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { C } from './primitives';
import { useCockpitData } from './useCockpitData';
import type { Diagnostics } from '../diagnostics';

/** Bandeau affiché SEULEMENT quand la télémétrie ne produit pas de données : dit pourquoi le cockpit est vide. */
export function DiagnosticsBanner() {
  const { data } = useCockpitData<Diagnostics>('/api/admin/monitoring/diagnostics', {}, { refreshMs: 60_000 });
  if (!data || data.status === 'OK') return null;
  return (
    <div role="alert" data-testid="diagnostics-banner"
      style={{ display: 'flex', gap: 12, padding: '12px 16px', marginBottom: 16, borderRadius: 14, background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.35)', color: C.text, fontSize: 13 }}>
      <AlertTriangle size={18} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <strong>Pas de données de télémétrie : </strong>{data.message}
        <div style={{ marginTop: 6, fontSize: 12, color: C.muted }}>
          Base lue par le cockpit : <code>{data.database}</code> · tours enregistrés : {data.turnsTotal}
          {data.lastTurnAt ? ` · dernier : ${new Date(data.lastTurnAt).toLocaleString('fr-FR')}` : ''}
        </div>
      </div>
    </div>
  );
}
