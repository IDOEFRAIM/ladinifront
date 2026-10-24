'use client';

import React, { useState } from 'react';
import { Card, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { callApi, errorMessage } from './api';
import { skipLabel, splitList } from './format';
import type { ConsentImportResult, ConsentRequestResult } from './types';

export const MAX_PHONES = 500;

const box: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, color: C.text, fontFamily: F.body };
const primary: React.CSSProperties = { border: 'none', background: C.forest, color: '#fff', borderRadius: 100, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', width: 'fit-content' };

/**
 * Consentement : ce qui autorise l'envoi d'une campagne. Avoir déjà écrit à LADINI n'inscrit personne.
 * - Importer : consentement RECUEILLI AILLEURS, avec une PREUVE obligatoire (jamais rétabli pour une personne désinscrite).
 * - Demander : met en file la question WhatsApp ; la réponse « oui » de la personne est traitée par la garde de conformité.
 */
export function ConsentsPanel() {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }} data-testid="consents-panel">
      <ImportForm />
      <RequestForm />
    </div>
  );
}

function PhonesField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const count = splitList(value).length;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Numéros (un par ligne, format international)
      <textarea aria-label="Numéros" rows={6} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...box, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
      <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{count} numéro(s){count > MAX_PHONES ? ` — maximum ${MAX_PHONES} par envoi` : ''}</span>
    </label>
  );
}

function ImportForm() {
  const [phones, setPhones] = useState('');
  const [evidence, setEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsentImportResult | null>(null);
  const list = splitList(phones);
  const invalid = list.length === 0 || list.length > MAX_PHONES || !evidence.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await callApi<ConsentImportResult>('POST', '/consents/import', { phones: list, evidence: evidence.trim() }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Importer des consentements" subtitle="Réservé aux consentements déjà recueillis (formulaire, accord écrit…). La preuve est conservée.">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PhonesField value={phones} onChange={setPhones} />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Preuve du consentement (obligatoire)
          <input aria-label="Preuve du consentement" value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="ex. formulaire papier du 12/09" maxLength={300} style={{ ...box, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }} />
        </label>
        <button type="submit" disabled={busy || invalid} style={primary}>{busy ? 'Import…' : 'Importer'}</button>
        {error && <div role="alert" style={{ fontSize: 12, color: '#991B1B' }}>{error}</div>}
        {result && (
          <div role="status" data-testid="import-result" style={{ fontSize: 13 }}>
            <b>{result.imported}</b> consentement(s) enregistré(s).
            {result.ignored.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {result.ignored.map((i, n) => <li key={`${i.phone_tail}-${n}`}>••• {i.phone_tail} : {skipLabel(i.reason)}</li>)}
              </ul>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}

function RequestForm() {
  const [phones, setPhones] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConsentRequestResult | null>(null);
  const list = splitList(phones);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await callApi<ConsentRequestResult>('POST', '/consents/request', { phones: list }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Demander le consentement par WhatsApp" subtitle="Envoie la question « Souhaitez-vous recevoir les disponibilités ? ». Rien n’est envoyé à une personne désinscrite ou déjà enregistrée.">
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PhonesField value={phones} onChange={setPhones} />
        <button type="submit" disabled={busy || list.length === 0 || list.length > MAX_PHONES} style={primary}>{busy ? 'Envoi…' : 'Mettre la question en file'}</button>
        {error && <div role="alert" style={{ fontSize: 12, color: '#991B1B' }}>{error}</div>}
        {result && (
          <div role="status" data-testid="request-result" style={{ fontSize: 13 }}>
            <b>{result.queued}</b> question(s) mise(s) en file.
            {result.skipped.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {result.skipped.map((i, n) => <li key={`${i.phone_tail}-${n}`}>••• {i.phone_tail} : {skipLabel(i.reason)}</li>)}
              </ul>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}
