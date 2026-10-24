// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { CampaignDetail } from '@/features/availability-campaigns/ui/CampaignDetail';
import { CampaignsPage } from '@/features/availability-campaigns/ui/CampaignsPage';
import { ConsentsPanel } from '@/features/availability-campaigns/ui/ConsentsPanel';
import { buildPayload, initialState } from '@/features/availability-campaigns/ui/CampaignForm';
import { fmtRate, localInputToIso, splitList } from '@/features/availability-campaigns/ui/format';
import type { Campaign, PreviewPayload, ResultsPayload } from '@/features/availability-campaigns/ui/types';

const ID = '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b';

const campaign: Campaign = {
  id: ID, name: 'Légumes semaine 41', status: 'DRAFT', audience: { audience_kind: 'ALL', regions: ['Guiriko'] },
  offer_filter: { products: ['tomate'], max_offers: 5 }, send_at: '2026-10-12T08:00:00', frequency: 'WEEKLY', interval_days: 7,
  response_window_hours: 48, delivery_date: null, next_run_at: null, last_run_key: null, content_version: 2, content_hash: null, preview: null,
  validated_at: null, cancelled_at: null, last_error: null, created_at: '2026-10-01T08:00:00', updated_at: '2026-10-01T08:00:00',
};

const preview: PreviewPayload = {
  campaign_id: ID, status: 'DRAFT', content_version: 2, computed_at: '2026-10-10T08:00:00',
  message: 'Bonjour ! Cette semaine sur LADINI :\n1. Tomates — 500 kg\nRépondez STOP pour ne plus recevoir ces messages.',
  content_hash: 'hash-1',
  offers: [{ product_id: 'p1', name: 'Tomates', unit: 'kg', quantity: 500, region: 'Guiriko', quality_class: null, price_label: '350 FCFA/kg', price_status: 'CERTIFIED', harvest_date: null, seen_at: '2026-10-09T08:00:00' }],
  excluded: [{ product_id: 'p2', name: 'Oignons', reasons: ['STALE', 'ZERO_QUANTITY'] }],
  audience: { recipients: 42, skipped: { NO_CONSENT: 7 } },
};

const results: ResultsPayload = {
  metrics: {
    prepared: 42, skipped: 2, failed: 1, accepted: 39, delivered: 30, read: 20, replied: 6, interests: { INTEREST: 4 }, opt_outs_after_send: 1,
    rates: {
      delivery_rate: { value: 0.7692, numerator: 'delivered', denominator: 'accepted' },
      reply_rate: { value: 0.2, numerator: 'replied', denominator: 'delivered' },
    },
    notes: 'Un intérêt n’est pas une vente.',
  },
  failures: [{ status: 'SKIPPED', reason: 'template_required', n: 2, phone_tails: ['1234', '5678'] }],
};

type Handler = Response | (() => Response);
function mockFetch(routes: Record<string, Handler>) {
  const f = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    const match = Object.keys(routes).find((k) => key.startsWith(k));
    if (!match) return new Response(JSON.stringify({ error: `no mock ${key}` }), { status: 404 });
    const v = routes[match];
    return typeof v === 'function' ? v() : v.clone();
  });
  vi.stubGlobal('fetch', f);
  return f;
}
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('console campagnes : fonctions pures', () => {
  it('un taux est toujours affiché avec son dénominateur', () => {
    expect(fmtRate({ value: 0.2, numerator: 'replied', denominator: 'delivered' })).toBe('20,0 % (replied / delivered)');
    expect(fmtRate({ value: null, numerator: 'delivered', denominator: 'accepted' })).toBe('n/a (delivered / accepted)');
  });

  it('listes saisies : séparateurs multiples, vides ignorés', () => {
    expect(splitList('tomate, oignon\n\nmil; ')).toEqual(['tomate', 'oignon', 'mil']);
  });

  it("date locale -> ISO sans fuseau (format attendu par le backend)", () => {
    expect(localInputToIso('2026-10-12T08:00')).toBe('2026-10-12T08:00:00');
    expect(localInputToIso('')).toBeNull();
  });

  it('le brouillon édité reproduit la campagne ; le corps envoyé est complet et typé', () => {
    const body = buildPayload(initialState(campaign));
    expect(body).toMatchObject({
      name: 'Légumes semaine 41', frequency: 'WEEKLY', interval_days: null, send_at: '2026-10-12T08:00:00', response_window_hours: 48,
      offer_filter: { products: ['tomate'], max_offers: 5, require_price: false },
      audience: { audience_kind: 'ALL', regions: ['Guiriko'], include_unknown_region: false },
    });
  });
});

describe('aperçu et validation', () => {
  it("affiche le message exact, l'audience, les offres retenues ET exclues avec leurs raisons", async () => {
    mockFetch({
      [`GET /api/admin/availability-campaigns/${ID}/preview`]: ok(preview),
      [`GET /api/admin/availability-campaigns/${ID}`]: ok({ campaign, recipients_by_status: {} }),
    });
    render(<CampaignDetail id={ID} onChanged={() => {}} onEdit={() => {}} />);
    expect(await screen.findByTestId('campaign-message')).toHaveTextContent('Répondez STOP');
    expect(screen.getByTestId('audience-size')).toHaveTextContent('42');
    expect(screen.getByText('350 FCFA/kg')).toBeInTheDocument();
    expect(screen.getByText(/Disponibilité non confirmée récemment · Quantité nulle/)).toBeInTheDocument();
    expect(screen.getByText(/Pas de consentement/)).toBeInTheDocument();
  });

  it("la validation envoie l'empreinte vue à l'aperçu ; un contenu modifié (409) est expliqué et l'aperçu rechargé", async () => {
    const f = mockFetch({
      [`GET /api/admin/availability-campaigns/${ID}/preview`]: ok(preview),
      [`GET /api/admin/availability-campaigns/${ID}`]: ok({ campaign, recipients_by_status: {} }),
      [`POST /api/admin/availability-campaigns/${ID}/validate`]: new Response(JSON.stringify({ error: 'Le contenu a changé depuis l’aperçu.' }), { status: 409 }),
    });
    render(<CampaignDetail id={ID} onChanged={() => {}} onEdit={() => {}} />);
    const button = await screen.findByTestId('validate-button');
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('Le contenu a changé depuis l’aperçu. Rechargez l’aperçu');
    const post = f.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({ content_hash: 'hash-1' });
    const previewLoads = f.mock.calls.filter(([url, init]) => String(url).endsWith('/preview') && !(init as RequestInit | undefined)?.method).length;
    expect(previewLoads).toBeGreaterThanOrEqual(2);
  });

  it('sans offre éligible : rien à diffuser, validation impossible', async () => {
    mockFetch({
      [`GET /api/admin/availability-campaigns/${ID}/preview`]: ok({ ...preview, offers: [], message: null, content_hash: null, audience: { recipients: 0, skipped: {} } }),
      [`GET /api/admin/availability-campaigns/${ID}`]: ok({ campaign, recipients_by_status: {} }),
    });
    render(<CampaignDetail id={ID} onChanged={() => {}} onEdit={() => {}} />);
    expect(await screen.findByText(/Aucune offre éligible/)).toBeInTheDocument();
    expect(screen.getByTestId('validate-button')).toBeDisabled();
  });

  it("une campagne programmée ne propose plus ni modification ni validation, seulement l'annulation", async () => {
    mockFetch({
      [`GET /api/admin/availability-campaigns/${ID}/preview`]: ok({ ...preview, status: 'SCHEDULED' }),
      [`GET /api/admin/availability-campaigns/${ID}`]: ok({ campaign: { ...campaign, status: 'SCHEDULED' }, recipients_by_status: {} }),
    });
    render(<CampaignDetail id={ID} onChanged={() => {}} onEdit={() => {}} />);
    await screen.findByTestId('campaign-detail');
    expect(screen.queryByText('Modifier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('validate-button')).not.toBeInTheDocument();
    expect(screen.getByText('Annuler la campagne')).toBeInTheDocument();
  });
});

describe('résultats', () => {
  it('les taux portent leur dénominateur et un intérêt n’est pas présenté comme une vente', async () => {
    mockFetch({
      [`GET /api/admin/availability-campaigns/${ID}/results`]: ok(results),
      [`GET /api/admin/availability-campaigns/${ID}/preview`]: ok(preview),
      [`GET /api/admin/availability-campaigns/${ID}`]: ok({ campaign: { ...campaign, status: 'COMPLETED' }, recipients_by_status: { SENT: 39 } }),
    });
    render(<CampaignDetail id={ID} onChanged={() => {}} onEdit={() => {}} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Résultats' }));
    expect(await screen.findByTestId('delivery-rate')).toHaveTextContent('76,9 % (delivered / accepted)');
    expect(screen.getByTestId('reply-rate')).toHaveTextContent('20,0 % (replied / delivered)');
    expect(screen.getByText(/Un intérêt n’est pas une commande ni une vente/)).toBeInTheDocument();
    expect(screen.getByText('Modèle WhatsApp requis (hors fenêtre de 24 h)')).toBeInTheDocument();
  });
});

describe('liste et consentements', () => {
  it('la liste affiche les campagnes avec leur statut', async () => {
    mockFetch({ 'GET /api/admin/availability-campaigns': ok({ items: [campaign] }) });
    render(<CampaignsPage />);
    expect(await screen.findByText('Légumes semaine 41')).toBeInTheDocument();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Brouillon')).toBeInTheDocument();
    expect(table.getByText('Hebdomadaire')).toBeInTheDocument();
  });

  it("l'import de consentements exige une preuve et affiche le résultat sans numéro complet", async () => {
    const f = mockFetch({
      'POST /api/admin/availability-campaigns/consents/import': ok({ imported: 1, ignored: [{ phone_tail: '0002', reason: 'OPTED_OUT_RESPECTED' }] }),
    });
    render(<ConsentsPanel />);
    const submit = screen.getByRole('button', { name: 'Importer' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getAllByLabelText('Numéros')[0], { target: { value: '+22670000001\n+22670000002' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Preuve du consentement'), { target: { value: 'formulaire papier 12/09' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    const result = await screen.findByTestId('import-result');
    expect(result).toHaveTextContent('1 consentement(s) enregistré(s).');
    expect(result).toHaveTextContent('••• 0002');
    expect(result.textContent).not.toContain('+226');
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toEqual({ phones: ['+22670000001', '+22670000002'], evidence: 'formulaire papier 12/09' });
  });
});
