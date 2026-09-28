'use client';

import React, { useEffect, useRef, useState } from 'react';
import { validateBid } from '@/features/auction/utils/auction-validator';
import type { Auction, BidsApiResponse, ProducerItem } from '@/features/auction/types/auction.types';
import { useCountdown } from '@/features/auction/hooks/useCountdown';
import { C, F } from '@/features/auction/utils/auction-tokens';
import { LoadingView, ErrorView } from '@/features/auction/components/AuctionStatusViews';
import AuctionHero from '@/features/auction/components/AuctionHero';
import AuctionLogistics from '@/features/auction/components/AuctionLogistics';
import AuctionBidForm, { type BidBasis, type BidMessage } from '@/features/auction/components/AuctionBidForm';
import AuctionProducersList from '@/features/auction/components/AuctionProducersList';
import AuctionBidList from '@/features/auction/components/AuctionBidList';
import AuctionAwardConfirm, { type AwardTarget } from '@/features/auction/components/AuctionAwardConfirm';
import AuctionAwardSuccess, { type AwardOutcome } from '@/features/auction/components/AuctionAwardSuccess';
import { unitDisplay } from '@/features/auction/pricing/units';
import { asError, codedError } from '@/lib/errors';
import type { AuctionBid } from '@/features/auction/types/auction.types';

export interface BidSubmitPayload {
  amount: number;
  basis: BidBasis;
  priceUnit?: string | null;
  estimatedDeliveryDate?: string;
}

export interface AwardSubmitPayload {
  winnerBidId: string;
  expectedFingerprint: string;
}

/** Codes serveur qui signifient "la décision a déjà été tranchée ailleurs" : on ferme la confirmation, on
 * n'affiche jamais une nouvelle tentative dessus, on rafraîchit. Jamais un rejeu automatique. */
const AWARD_ALREADY_DECIDED_CODES = new Set(['auction_not_open', 'concurrent_update', 'order_exists']);
const AWARD_BID_GONE_CODES = new Set(['bid_not_found', 'bid_not_selectable']);

// ─── Main Component ──────────────────────────────────────────────────
export default function AuctionClient({ auctionId, initialAuction, initialProducers, serverLoad, serverSubmit, serverAward }: { auctionId: string; initialAuction?: Auction | null; initialProducers?: ProducerItem[]; serverLoad?: (auctionId: string) => Promise<{ auction: Auction | null; producers: ProducerItem[] }>; serverSubmit?: (auctionId: string, payload: BidSubmitPayload) => Promise<any>; serverAward?: (auctionId: string, payload: AwardSubmitPayload) => Promise<any> }) {
  const [auction, setAuction] = useState<Auction | null>(initialAuction ?? null);
  const [producers, setProducers] = useState<ProducerItem[]>(initialProducers ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bidsData, setBidsData] = useState<BidsApiResponse | null>(null);
  const [bidsLoading, setBidsLoading] = useState(false);

  // Bid form
  const [price, setPrice] = useState('');
  const [basis, setBasis] = useState<BidBasis>('PER_BASE_UNIT');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bidMessage, setBidMessage] = useState<BidMessage | null>(null);

  // Award confirm flow — voir AuctionAwardConfirm : `awardTarget` capture les termes CERTIFIÉS au moment de la
  // sélection (jamais recalculés) ; `expectedFingerprint` est renvoyé tel quel, le serveur le revalide.
  const [awardTarget, setAwardTarget] = useState<AwardTarget | null>(null);
  const [awarding, setAwarding] = useState(false);
  // Ref (pas seulement l'état) : deux invocations synchrones de `confirmAward` dans le même tick (double-clic
  // avant le re-render) doivent être bloquées immédiatement — l'état React ne se met à jour qu'après.
  const awardingRef = useRef(false);
  const [awardError, setAwardError] = useState<string | null>(null);
  const [awardNotice, setAwardNotice] = useState<string | null>(null);
  const [awardOutcome, setAwardOutcome] = useState<AwardOutcome | null>(null);

  const { remaining, expired } = useCountdown(auction?.deadline ?? null);
  const isOpen = auction?.status === 'OPEN' && !expired;

  const lastDeadlineRef = useRef<string | null>(initialAuction?.deadline ?? null);
  const [deadlinePulse, setDeadlinePulse] = useState(false);

  // Client-side refresh loads (keeps ability to refresh and submit bids via existing API)
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (serverLoad) {
        const res = await serverLoad(auctionId);
        setAuction(res?.auction ?? null);
        setProducers(res?.producers ?? []);
      } else {
        const [aRes, pRes, bRes] = await Promise.all([
          fetch(`/api/auctions/${auctionId}`),
          fetch(`/api/auctions/${auctionId}/eligible-producers`),
          fetch(`/api/auctions/${auctionId}/bids`),
        ]);
        if (!aRes.ok) throw new Error('Impossible de charger l\'enchère');
        const aJson = await aRes.json();
        const pJson = await pRes.json();
        setAuction(aJson.data ?? null);
        setProducers(pJson.data ?? []);
        if (bRes.ok) {
          const bJson = await bRes.json();
          setBidsData((bJson.data ?? null) as BidsApiResponse | null);
        }
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  async function loadBidsSilently() {
    if (!auctionId) return;
    setBidsLoading(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bids`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setBidsData((json.data ?? null) as BidsApiResponse | null);
    } finally {
      setBidsLoading(false);
    }
  }

  async function refreshAuctionMetaSilently() {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      const next = (json.data ?? null) as Auction | null;
      if (!next) return;

      const nextDeadline = next.deadline ? new Date(next.deadline).toISOString() : null;
      const prevDeadline = lastDeadlineRef.current;

      if (prevDeadline && nextDeadline && nextDeadline !== prevDeadline) {
        const prevTs = new Date(prevDeadline).getTime();
        const nextTs = new Date(nextDeadline).getTime();
        if (!isNaN(prevTs) && !isNaN(nextTs) && nextTs > prevTs) {
          setDeadlinePulse(true);
          window.setTimeout(() => setDeadlinePulse(false), 1400);
        }
      }

      lastDeadlineRef.current = nextDeadline;
      setAuction((prev) => (prev ? { ...prev, ...next, deadline: nextDeadline } : { ...next, deadline: nextDeadline }));
    } catch {
      // silent
    }
  }

  useEffect(() => {
    // load bids once (needed for delivery estimate widget)
    loadBidsSilently();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  useEffect(() => {
    if (!auctionId) return;
    if (!isOpen) return;
    const id = window.setInterval(() => {
      refreshAuctionMetaSilently();
      loadBidsSilently();
    }, 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId, isOpen]);

  // ─── Submit bid ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBidMessage(null);
    const numPrice = parseFloat(price);

    if (!numPrice || numPrice <= 0) {
      setBidMessage({ type: 'error', text: 'Entrez un prix valide supérieur à 0' });
      return;
    }

    // Validation d'incrément (50 FCFA) : n'a de sens QUE pour un prix par unité de l'enchère (même base que le
    // plafond `maxPricePerUnit`) — un montant TOTAL_LOT n'est pas comparable à ce plafone brut ici. Le serveur
    // revalide de toute façon le VRAI plafond sur le total comparable (`exceedsCeiling`), quelle que soit la base.
    if (basis === 'PER_BASE_UNIT') {
      const validation = validateBid(null, numPrice, 50, auction?.maxPricePerUnit ?? null, true);
      if (!validation.valid) {
        setBidMessage({ type: 'error', text: validation.error || 'Enchère invalide' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const priceUnit = basis === 'PER_BASE_UNIT' ? (auction?.unit ?? null) : null;
      if (serverSubmit) {
        await serverSubmit(auctionId, { amount: numPrice, basis, priceUnit });
      } else {
        const res = await fetch(`/api/auctions/${auctionId}/bids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: numPrice,
            basis,
            priceUnit,
            estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erreur');
      }
      setBidMessage({ type: 'success', text: 'Offre soumise avec succès !' });
      setPrice('');
      setEstimatedDeliveryDate('');
      // Refresh producers list
      if (serverLoad) {
        const res = await serverLoad(auctionId);
        setProducers(res?.producers ?? []);
        setAuction(res?.auction ?? null);
      } else {
        const pRes = await fetch(`/api/auctions/${auctionId}/eligible-producers`);
        const pJson = await pRes.json();
        setProducers(pJson.data ?? []);
        await refreshAuctionMetaSilently();
        await loadBidsSilently();
      }
    } catch (_e: unknown) {
    const e = asError(_e);
      setBidMessage({ type: 'error', text: e.message || 'Erreur lors de la soumission' });
    } finally {
      setSubmitting(false);
    }
  }


  // ─── Attribution ────────────────────────────────────────────────
  function auctionQuantityLabel(): string | null {
    if (!auction?.unit || auction.quantity == null) return null;
    const qty = Number(auction.quantity);
    return Number.isFinite(qty) ? `${qty} ${unitDisplay(auction.unit, qty)}` : null;
  }

  function openAwardConfirm(bid: AuctionBid) {
    if (!bid.awardable || !bid.award || !bid.comparableTotal) return;
    setAwardError(null);
    setAwardNotice(null);
    setAwardTarget({
      bidId: bid.id,
      producerName: bid.producerName || 'ce producteur',
      pricingLabel: bid.pricingLabel || '',
      comparableTotal: bid.comparableTotal,
      fingerprint: bid.award.fingerprint,
    });
  }

  function closeAwardConfirm() {
    if (awarding) return;
    setAwardTarget(null);
    setAwardError(null);
  }

  async function confirmAward() {
    // Étape 10 — la sécurité ne doit pas dépendre SEULEMENT du bouton disabled (déjà le cas via `submitting`
    // sur AuctionAwardConfirm) : un second appel synchrone (double-clic avant le re-render) est un no-op ici.
    if (!awardTarget || awardingRef.current) return;
    awardingRef.current = true;
    setAwarding(true);
    setAwardError(null);
    try {
      const payload: AwardSubmitPayload = { winnerBidId: awardTarget.bidId, expectedFingerprint: awardTarget.fingerprint };
      const data = serverAward
        ? await serverAward(auctionId, payload)
        : await (async () => {
            const res = await fetch(`/api/auctions/${auctionId}/award`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw codedError(json.code || 'award_failed', json.error || 'Erreur lors de l\'attribution');
            return json.data;
          })();

      setAwardTarget(null);
      setAwardOutcome({
        producerName: awardTarget.producerName,
        pricingLabel: data?.pricingLabel ?? awardTarget.pricingLabel,
        quantityLabel: auctionQuantityLabel(),
        totalAmount: data?.totalAmount ?? awardTarget.comparableTotal,
        auctionStatus: data?.status ?? 'AWARDED',
        idempotent: Boolean(data?.idempotent),
      });
      await refreshAuctionMetaSilently();
      await loadBidsSilently();
    } catch (_e: unknown) {
      const e = asError(_e);
      const code = String((e as { code?: unknown }).code ?? '');

      // Étape 7 — termes périmés : le producteur a changé son offre entre l'affichage et la confirmation.
      // JAMAIS attribué sur d'anciens termes ; la confirmation est invalidée, une nouvelle est obligatoire.
      if (code === 'award_terms_changed') {
        setAwardTarget(null);
        setAwardNotice("L'offre a changé depuis votre confirmation. Veuillez vérifier les nouvelles conditions.");
        await loadBidsSilently();
        return;
      }
      // Étape 8 — l'offre a disparu (retirée / déjà tranchée) entre-temps.
      if (AWARD_BID_GONE_CODES.has(code)) {
        setAwardTarget(null);
        setAwardNotice("Cette offre n'est plus disponible.");
        await loadBidsSilently();
        return;
      }
      // Étape 11 — concurrence : un autre onglet/admin a déjà attribué (ou une commande existe déjà) pendant
      // que cette confirmation était ouverte. On ne rejoue rien, on referme et on rafraîchit l'état réel.
      if (AWARD_ALREADY_DECIDED_CODES.has(code)) {
        setAwardTarget(null);
        setAwardNotice('Cette enchère a déjà été attribuée ou fermée entre-temps.');
        await refreshAuctionMetaSilently();
        await loadBidsSilently();
        return;
      }
      // Erreur générique : reste affichée DANS la modale pour permettre une nouvelle tentative (pas de perte
      // de contexte — les termes affichés restent ceux capturés à la sélection).
      setAwardError(e.message || "Erreur lors de l'attribution");
    } finally {
      awardingRef.current = false;
      setAwarding(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────
  if (loading) return <LoadingView />;
  if (error || !auction) return <ErrorView message={error || 'Enchère introuvable'} onRetry={loadData} />;

  const escrowVerified = Boolean(auction.escrowWalletId) && String(auction.escrowStatus || '').toUpperCase() === 'VERIFIED';

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12" style={{ background: C.sand, fontFamily: F.body }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <AuctionHero auction={auction} remaining={remaining} deadlinePulse={deadlinePulse} escrowVerified={escrowVerified} />

        {awardOutcome && <AuctionAwardSuccess outcome={awardOutcome} />}
        {awardNotice && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {awardNotice}
          </div>
        )}

        <AuctionLogistics auction={auction} bidsData={bidsData} bidsLoading={bidsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AuctionBidForm
            isOpen={isOpen}
            expired={expired}
            maxPricePerUnit={auction.maxPricePerUnit}
            auctionUnit={auction.unit ?? 'TONNE'}
            basis={basis}
            onBasisChange={setBasis}
            price={price}
            onPriceChange={setPrice}
            estimatedDeliveryDate={estimatedDeliveryDate}
            onEstimatedDeliveryDateChange={setEstimatedDeliveryDate}
            submitting={submitting}
            bidMessage={bidMessage}
            onSubmit={handleSubmit}
          />
          <AuctionProducersList producers={producers} onRefresh={loadData} />
        </div>

        <AuctionBidList
          auction={auction}
          bids={bidsData?.bids ?? []}
          loading={bidsLoading}
          viewerCanAward={Boolean(bidsData?.viewerCanAward)}
          onSelectForAward={openAwardConfirm}
        />
      </div>

      <AuctionAwardConfirm
        auction={auction}
        target={awardTarget}
        submitting={awarding}
        error={awardError}
        onCancel={closeAwardConfirm}
        onConfirm={confirmAward}
      />
    </div>
  );
}
