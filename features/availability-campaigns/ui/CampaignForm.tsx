'use client';

import React, { useState } from 'react';
import { Select, C, F } from '@/features/monitoring/cockpit/ui/primitives';
import { callApi, errorMessage } from './api';
import { isoToLocalInput, localInputToIso, splitList } from './format';
import type { AudienceKind, Campaign, Frequency } from './types';

const FREQUENCIES = [
  { value: 'ONCE', label: 'Une seule fois' },
  { value: 'WEEKLY', label: 'Chaque semaine' },
  { value: 'CUSTOM_DAYS', label: 'Tous les N jours' },
];

const AUDIENCE_KINDS = [
  { value: 'ALL', label: 'Tous les contacts consentants' },
  { value: 'KNOWN', label: 'Acheteurs ayant un compte' },
  { value: 'NEW', label: 'Nouveaux contacts (découverte)' },
];

const field: React.CSSProperties = { padding: '8px 10px', borderRadius: 10, border: `1px solid ${C.border}`, background: '#fff', fontSize: 13, color: C.text };
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' };

/** Construit le corps envoyé au backend à partir de l'état du formulaire (le backend revalide tout). */
export function buildPayload(f: FormState): Record<string, unknown> {
  const offerFilter: Record<string, unknown> = {
    products: splitList(f.products),
    categories: splitList(f.categories),
    regions: splitList(f.offerRegions),
    max_offers: Number(f.maxOffers),
    require_price: f.requirePrice,
  };
  if (f.maxAgeHours.trim()) offerFilter.max_age_hours = Number(f.maxAgeHours);
  return {
    name: f.name.trim(),
    frequency: f.frequency,
    interval_days: f.frequency === 'CUSTOM_DAYS' ? Number(f.intervalDays) : null,
    send_at: localInputToIso(f.sendAt),
    delivery_date: f.deliveryDate || null,
    response_window_hours: Number(f.windowHours),
    offer_filter: offerFilter,
    audience: {
      audience_kind: f.audienceKind,
      regions: splitList(f.audienceRegions),
      include_unknown_region: f.includeUnknownRegion,
    },
  };
}

export interface FormState {
  name: string;
  products: string;
  categories: string;
  offerRegions: string;
  maxOffers: string;
  maxAgeHours: string;
  requirePrice: boolean;
  audienceKind: AudienceKind;
  audienceRegions: string;
  includeUnknownRegion: boolean;
  frequency: Frequency;
  intervalDays: string;
  sendAt: string;
  deliveryDate: string;
  windowHours: string;
}

export function initialState(c?: Campaign): FormState {
  return {
    name: c?.name ?? '',
    products: (c?.offer_filter.products ?? []).join(', '),
    categories: (c?.offer_filter.categories ?? []).join(', '),
    offerRegions: (c?.offer_filter.regions ?? []).join(', '),
    maxOffers: String(c?.offer_filter.max_offers ?? 5),
    maxAgeHours: c?.offer_filter.max_age_hours ? String(c.offer_filter.max_age_hours) : '',
    requirePrice: !!c?.offer_filter.require_price,
    audienceKind: c?.audience.audience_kind ?? 'ALL',
    audienceRegions: (c?.audience.regions ?? []).join(', '),
    includeUnknownRegion: !!c?.audience.include_unknown_region,
    frequency: c?.frequency ?? 'ONCE',
    intervalDays: c?.interval_days ? String(c.interval_days) : '7',
    sendAt: isoToLocalInput(c?.send_at),
    deliveryDate: c?.delivery_date ?? '',
    windowHours: String(c?.response_window_hours ?? 48),
  };
}

/** Création (sans `campaign`) ou modification d'un BROUILLON (avec `campaign` : `expected_version` = version vue, 409 si périmée). */
export function CampaignForm({ campaign, onSaved, onCancel }: { campaign?: Campaign; onSaved: (c: Campaign) => void; onCancel: () => void }) {
  const [f, setF] = useState<FormState>(() => initialState(campaign));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K) => (value: FormState[K]) => setF((s) => ({ ...s, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = buildPayload(f);
      const saved = campaign
        ? await callApi<Campaign>('PATCH', `/${campaign.id}`, { ...body, expected_version: campaign.content_version })
        : await callApi<Campaign>('POST', '', body);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const text = (key: keyof FormState, lbl: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={label}>
      {lbl}
      <input aria-label={lbl} value={String(f[key])} onChange={(e) => set(key)(e.target.value as never)} style={field} {...props} />
    </label>
  );

  return (
    <form onSubmit={submit} data-testid="campaign-form" style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: F.body }}>
      {text('name', 'Nom de la campagne', { required: true, maxLength: 200 })}
      <fieldset style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <legend style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>Offres à présenter</legend>
        {text('products', 'Produits (séparés par des virgules ; vide = tous les éligibles)')}
        {text('categories', 'Catégories')}
        {text('offerRegions', 'Régions des producteurs')}
        {text('maxOffers', 'Nombre maximum d’offres (1 à 5)', { type: 'number', min: 1, max: 5 })}
        {text('maxAgeHours', 'Fraîcheur maximale en heures (vide = réglage plateforme)', { type: 'number', min: 1 })}
        <label style={{ ...label, flexDirection: 'row', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
          <input type="checkbox" checked={f.requirePrice} onChange={(e) => set('requirePrice')(e.target.checked)} />
          Exclure les offres dont le prix n’est pas fiable
        </label>
      </fieldset>
      <fieldset style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <legend style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>Destinataires (consentement obligatoire)</legend>
        <Select label="Audience" value={f.audienceKind} onChange={(v) => set('audienceKind')(v as AudienceKind)} options={AUDIENCE_KINDS} />
        {text('audienceRegions', 'Régions des destinataires (vide = toutes)')}
        <label style={{ ...label, flexDirection: 'row', alignItems: 'center', gap: 8, textTransform: 'none', letterSpacing: 0 }}>
          <input type="checkbox" checked={f.includeUnknownRegion} onChange={(e) => set('includeUnknownRegion')(e.target.checked)} />
          Inclure les contacts dont la région est inconnue
        </label>
      </fieldset>
      <fieldset style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'grid', gap: 10 }}>
        <legend style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>Planification</legend>
        <Select label="Fréquence" value={f.frequency} onChange={(v) => set('frequency')(v as Frequency)} options={FREQUENCIES} />
        {f.frequency === 'CUSTOM_DAYS' && text('intervalDays', 'Intervalle en jours', { type: 'number', min: 1 })}
        {text('sendAt', 'Date et heure d’envoi', { type: 'datetime-local' })}
        {text('deliveryDate', 'Date de disponibilité / livraison annoncée', { type: 'date' })}
        {text('windowHours', 'Délai de réponse en heures (1 à 720)', { type: 'number', min: 1, max: 720 })}
      </fieldset>
      {error && <div role="alert" style={{ fontSize: 12, color: '#991B1B' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={saving} style={{ border: 'none', background: C.forest, color: '#fff', borderRadius: 100, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Enregistrement…' : campaign ? 'Enregistrer le brouillon' : 'Créer le brouillon'}
        </button>
        <button type="button" onClick={onCancel} style={{ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '8px 18px', cursor: 'pointer' }}>Fermer</button>
      </div>
    </form>
  );
}
