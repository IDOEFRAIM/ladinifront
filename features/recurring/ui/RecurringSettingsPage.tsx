'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCockpitData } from '@/features/monitoring/cockpit/ui/useCockpitData';
import { Card, DataState, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import type { SettingsPayload } from '../types';
import { fmtAgo, fmtDays } from './format';

/**
 * Recurring › Réglages (OPERATIONS) — délai minimal avant la première livraison d'un besoin récurrent.
 * Réglage GLOBAL, versionné et audité côté backend ; un changement ne touche QUE les besoins créés ensuite.
 */
export function RecurringSettingsPage() {
  const { data, loading, error, refetch } = useCockpitData<SettingsPayload>('/api/admin/recurring/settings', {});
  const current = data?.recurring;

  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (current) setDraft(String(current.minimum_start_lead_days));
  }, [current?.minimum_start_lead_days, current?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const bounds = current?.bounds ?? { min: 0, max: 30 };
  const parsed = /^\d+$/.test(draft.trim()) ? Number(draft.trim()) : NaN;
  const valid = Number.isInteger(parsed) && parsed >= bounds.min && parsed <= bounds.max;
  const unchanged = current !== undefined && valid && parsed === current.minimum_start_lead_days;

  async function save() {
    if (!current || !valid) return;
    setSaving(true);
    setSaveError(null);
    setSaved(null);
    try {
      const res = await fetch('/api/admin/recurring/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        // `expected_version` : refuse d'écraser un changement fait entre-temps par un autre admin (409).
        body: JSON.stringify({ minimum_start_lead_days: parsed, expected_version: current.version }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `Erreur ${res.status}`);
      }
      setSaved(`Délai enregistré : ${fmtDays(parsed)}. Il s'applique aux prochains besoins créés.`);
      refetch();
    } catch (e) {
      setSaveError((e as Error).message);
      if (/entre-temps/i.test((e as Error).message)) refetch();
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: F.body, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontFamily: F.heading, fontSize: 22, color: C.forest, margin: 0 }}>Recurring — Réglages</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
          <Link href="/admin/recurring/needs" style={{ color: C.forest, fontWeight: 600 }}>← Besoins récurrents</Link>
          {' · '}
          <Link href="/admin/analytics/buyers" style={{ color: C.forest, fontWeight: 600 }}>Analytics acheteurs</Link>
        </p>
      </div>

      <Card title="Délai minimum avant première livraison" testId="recurring-settings-card">
        <DataState loading={loading} error={error} hasData={!!data} onRetry={refetch}>
          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                Nombre minimal de jours entre la création d&apos;un besoin récurrent et sa première livraison. Il laisse à Ladini
                le temps de matérialiser la livraison, chercher des producteurs, recueillir leurs réponses et obtenir les confirmations.
              </p>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valeur actuelle</div>
                  <div data-testid="recurring-current-value" style={{ fontFamily: F.heading, fontSize: 28, fontWeight: 700, color: C.forest }}>
                    {fmtDays(current.minimum_start_lead_days)}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {current.source === 'DEFAULT'
                    ? `Valeur par défaut (${fmtDays(current.default)}) — jamais modifiée.`
                    : `Enregistrée ${fmtAgo(current.updated_at)} · version ${current.version}`}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <label htmlFor="lead-days" style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nouveau délai (jours, entre {bounds.min} et {bounds.max})
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                  <input
                    id="lead-days"
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setConfirming(false); setSaved(null); setSaveError(null); }}
                    aria-invalid={!valid}
                    style={{ width: 90, padding: '8px 10px', borderRadius: 8, border: `1px solid ${valid ? C.border : C.red}`, fontFamily: F.body, fontSize: 15 }}
                  />
                  {!confirming ? (
                    <button
                      disabled={!valid || unchanged || saving}
                      onClick={() => setConfirming(true)}
                      style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '8px 18px', fontWeight: 700, cursor: valid && !unchanged ? 'pointer' : 'default', opacity: valid && !unchanged ? 1 : 0.5 }}
                    >
                      Enregistrer
                    </button>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, color: C.muted }}>
                        Passer de {fmtDays(current.minimum_start_lead_days)} à {fmtDays(parsed)} pour les <b>nouveaux</b> besoins ?
                      </span>
                      <button onClick={save} disabled={saving} style={{ background: C.forest, color: '#fff', border: 'none', borderRadius: 100, padding: '6px 14px', fontWeight: 700, cursor: 'pointer' }}>
                        {saving ? 'Enregistrement…' : 'Confirmer'}
                      </button>
                      <button onClick={() => setConfirming(false)} disabled={saving} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 100, padding: '6px 14px', cursor: 'pointer' }}>
                        Annuler
                      </button>
                    </>
                  )}
                </div>
                {!valid && draft !== '' && (
                  <p role="alert" style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>
                    Entrez un nombre entier de jours entre {bounds.min} et {bounds.max}.
                  </p>
                )}
                {saveError && <p role="alert" style={{ color: C.red, fontSize: 12, margin: '6px 0 0' }}>{saveError}</p>}
                {saved && <p role="status" style={{ color: C.emerald, fontSize: 12, margin: '6px 0 0', fontWeight: 600 }}>{saved}</p>}
              </div>

              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                <li>Ne modifie jamais les besoins déjà créés : leur date de début est figée.</li>
                <li>Un brouillon confirmé après le changement utilise la nouvelle valeur.</li>
                <li>Une date demandée plus tôt que ce délai est repoussée au minimum, et l&apos;acheteur en est informé.</li>
                <li>Chaque modification est auditée (ancienne valeur, nouvelle valeur, administrateur, date).</li>
              </ul>
            </div>
          )}
        </DataState>
      </Card>
    </div>
  );
}
