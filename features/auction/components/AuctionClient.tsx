'use client';

import React, { useEffect, useRef, useState } from 'react';
import { validateBid } from '@/features/auction/utils/auction-validator';
import type { Auction, BidsApiResponse, ProducerItem } from '@/features/auction/types/auction.types';
import { useCountdown } from '@/features/auction/hooks/useCountdown';
import { C, F } from '@/features/auction/utils/auction-tokens';
import { LoadingView, ErrorView } from '@/features/auction/components/AuctionStatusViews';
import AuctionHero from '@/features/auction/components/AuctionHero';
import AuctionLogistics from '@/features/auction/components/AuctionLogistics';
import AuctionBidForm, { type BidMessage } from '@/features/auction/components/AuctionBidForm';
import AuctionProducersList from '@/features/auction/components/AuctionProducersList';
import { asError } from '@/lib/errors';

// ─── Main Component ──────────────────────────────────────────────────
export default function AuctionClient({ auctionId, initialAuction, initialProducers, serverLoad, serverSubmit }: { auctionId: string; initialAuction?: Auction | null; initialProducers?: ProducerItem[]; serverLoad?: (auctionId: string) => Promise<{ auction: Auction | null; producers: ProducerItem[] }>; serverSubmit?: (auctionId: string, payload: { offeredPrice: number }) => Promise<any> }) {
  const [auction, setAuction] = useState<Auction | null>(initialAuction ?? null);
  const [producers, setProducers] = useState<ProducerItem[]>(initialProducers ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bidsData, setBidsData] = useState<BidsApiResponse | null>(null);
  const [bidsLoading, setBidsLoading] = useState(false);

  // Bid form
  const [price, setPrice] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bidMessage, setBidMessage] = useState<BidMessage | null>(null);

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

    // Bid validation with minimum increment (50 FCFA default)
    const currentBest = producers.find(p => p.hasBid)?.trustScore?.globalScore ?? null;
    const validation = validateBid(null, numPrice, 50, auction?.maxPricePerUnit ?? null, true);
    if (!validation.valid) {
      setBidMessage({ type: 'error', text: validation.error || 'Enchère invalide' });
      return;
    }

    setSubmitting(true);
    try {
      if (serverSubmit) {
        await serverSubmit(auctionId, { offeredPrice: numPrice } as any);
      } else {
        const res = await fetch(`/api/auctions/${auctionId}/bids`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offeredPrice: numPrice,
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


  // ─── Render ─────────────────────────────────────────────────────
  if (loading) return <LoadingView />;
  if (error || !auction) return <ErrorView message={error || 'Enchère introuvable'} onRetry={loadData} />;

  const escrowVerified = Boolean(auction.escrowWalletId) && String(auction.escrowStatus || '').toUpperCase() === 'VERIFIED';

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12" style={{ background: C.sand, fontFamily: F.body }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <AuctionHero auction={auction} remaining={remaining} deadlinePulse={deadlinePulse} escrowVerified={escrowVerified} />
        <AuctionLogistics auction={auction} bidsData={bidsData} bidsLoading={bidsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AuctionBidForm
            isOpen={isOpen}
            expired={expired}
            maxPricePerUnit={auction.maxPricePerUnit}
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
      </div>
    </div>
  );
}
