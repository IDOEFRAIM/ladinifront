'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Gavel, Clock, TrendingUp, Users, Send, RefreshCw, Shield, MapPin, Star, Info, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateBid, getNextBidAmount } from '@/logic/auctionValidator';

// ─── Design tokens (aligne sur le style-guide AgriConnect) ───────────
const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  lime: '#84CC16',
  amber: '#D97706',
  sand: '#F9FBF8',
  glass: 'rgba(255,255,255,0.72)',
  border: 'rgba(6,78,59,0.07)',
  muted: '#64748B',
  text: '#1F2937',
  danger: '#DC2626',
};
const F = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

// ─── Types ───────────────────────────────────────────────────────────
type Auction = {
  id: string;
  status: string;
  deadline: string | null;
  maxPricePerUnit: number | null;
  autoExtend?: boolean | null;
  escrowWalletId?: string | null;
  escrowStatus?: string | null;
  incoterm?: string | null;
  deliveryLocation?: string | null;
  deliveryDeadline?: string | Date | null;
  subCategoryId?: string | null;
  targetZoneId?: string | null;
  targetZone?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

type AuctionBid = {
  id: string;
  producerName?: string;
  offeredPrice: number;
  estimatedDeliveryDate?: string | Date | null;
  isBestBid?: boolean;
};

type BidsApiResponse = {
  auctionId: string;
  auctionStatus: string;
  totalBids: number;
  bestBidPrice: number | null;
  bids: AuctionBid[];
};

type ProducerItem = {
  producerId: string;
  userId: string;
  name: string;
  zoneId: string | null;
  geoPriority: number;
  trustScore?: { globalScore?: number; reliabilityIndex?: number } | null;
  hasBid?: boolean;
  hasMatchingProduct?: boolean | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────
function useCountdown(deadline: string | null) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!deadline) { setRemaining('—'); return; }
    const target = new Date(deadline).getTime();

    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Expiré'); setExpired(true); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      setExpired(false);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return { remaining, expired };
}

const geoPriorityLabel = (p: number) => {
  if (p === 1) return { text: 'Zone locale', color: 'bg-emerald-100 text-emerald-800' };
  if (p === 2) return { text: 'Zone voisine', color: 'bg-amber-100 text-amber-800' };
  return { text: 'Région élargie', color: 'bg-stone-100 text-stone-700' };
};

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'En cours', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CLOSED: { label: 'Fermée', bg: 'bg-stone-200', text: 'text-stone-700' },
  AWARDED: { label: 'Attribuée', bg: 'bg-blue-100', text: 'text-blue-800' },
  CANCELLED: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-800' },
};

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function incotermHelp(incoterm?: string | null) {
  const key = (incoterm || '').toUpperCase();
  const map: Record<string, string> = {
    DDP: "DDP : le vendeur livre jusqu'à votre site (formalités à sa charge).",
    EXW: 'EXW : à récupérer à la ferme / entrepôt du vendeur.',
    FCA: 'FCA : remis au transporteur à un point convenu.',
    CIP: "CIP : transport assuré jusqu'au lieu convenu.",
    CPT: "CPT : transport payé jusqu'au lieu convenu.",
  };
  return map[key] || "Incoterm : condition de livraison convenue entre acheteur et vendeur.";
}

// ─── Sub-views ───────────────────────────────────────────────────────
function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 size={36} className="animate-spin" style={{ color: C.emerald }} />
      <p className="text-sm text-stone-500" style={{ fontFamily: F.body }}>Chargement de l'enchère…</p>
    </div>
  );
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertTriangle size={40} style={{ color: C.amber }} />
      <p className="text-sm text-stone-600 text-center max-w-xs" style={{ fontFamily: F.body }}>{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-105"
        style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
      >
        <RefreshCw size={14} /> Réessayer
      </button>
    </div>
  );
}

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
  const [bidMessage, setBidMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    } catch (e: any) {
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
    } catch (e: any) {
      setBidMessage({ type: 'error', text: e.message || 'Erreur lors de la soumission' });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────
  if (loading) return <LoadingView />;
  if (error || !auction) return <ErrorView message={error || 'Enchère introuvable'} onRetry={loadData} />;

  const status = statusConfig[auction.status] ?? statusConfig.CLOSED;
  const escrowVerified = Boolean(auction.escrowWalletId) && String(auction.escrowStatus || '').toUpperCase() === 'VERIFIED';
  const bestBid = bidsData?.bids?.find((b) => b.isBestBid) ?? null;
  const bestEstimated = bestBid?.estimatedDeliveryDate ?? null;
  const deliveryDeadlineStr = formatDateTime(auction.deliveryDeadline ?? null);
  const bestEstimatedStr = formatDateTime(bestEstimated as any);
  const bestAfterDeadline = (() => {
    const a = auction.deliveryDeadline ? new Date(auction.deliveryDeadline as any).getTime() : NaN;
    const b = bestEstimated ? new Date(bestEstimated as any).getTime() : NaN;
    return !isNaN(a) && !isNaN(b) && b > a;
  })();

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12" style={{ background: C.sand, fontFamily: F.body }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ─── Hero Card ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)` }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
            <Gavel size={160} />
          </div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`${status.bg} ${status.text} text-xs font-bold px-3 py-1 rounded-full`}>
                {status.label}
              </span>
              {auction.subCategory && (
                <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {auction.subCategory.name}
                </span>
              )}
              {auction.autoExtend ? (
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Anti-snipe activé
                </span>
              ) : null}
              {escrowVerified ? (
                <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Shield size={14} /> Fonds sécurisés par la plateforme
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2" style={{ fontFamily: F.heading }}>
              Enchère #{auction.id.slice(-6).toUpperCase()}
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className={`flex items-center gap-3 rounded-xl px-2 py-1 ${deadlinePulse ? 'bg-white/10 animate-pulse' : ''}`}>
                <div className="p-2 rounded-lg bg-white/10">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium">Temps restant</p>
                  <p className="text-sm font-bold">{remaining}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-medium">Plafond prix</p>
                  <p className="text-sm font-bold">{auction.maxPricePerUnit ? `${auction.maxPricePerUnit} FCFA` : '—'}</p>
                </div>
              </div>
              {auction.targetZone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/10">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-white/60 text-xs font-medium">Zone cible</p>
                    <p className="text-sm font-bold">{auction.targetZone.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Logistics widget ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Truck size={18} style={{ color: C.forest }} />
              <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: F.heading }}>Conditions logistiques</h2>
            </div>
            <div className="text-xs text-stone-400">
              {bidsLoading ? 'Mise à jour…' : `${bidsData?.totalBids ?? 0} offre(s)`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {auction.incoterm ? (
              <div className="rounded-xl border border-stone-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Incoterm</p>
                  <span
                    className="inline-flex items-center gap-1 text-stone-400"
                    title={incotermHelp(auction.incoterm)}
                    aria-label={incotermHelp(auction.incoterm)}
                  >
                    <Info size={14} />
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-stone-900">{String(auction.incoterm).toUpperCase()}</p>
                <p className="mt-1 text-xs text-stone-500">{incotermHelp(auction.incoterm)}</p>
              </div>
            ) : null}

            {auction.deliveryLocation ? (
              <div className="rounded-xl border border-stone-100 p-4">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Lieu de livraison / retrait</p>
                <p className="mt-1 text-sm font-semibold text-stone-900 break-words">{auction.deliveryLocation}</p>
              </div>
            ) : null}

            <div className="rounded-xl border border-stone-100 p-4">
              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Délais</p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-stone-500">Limite acheteur</span>
                  <span className="font-semibold text-stone-900">{deliveryDeadlineStr}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-stone-500">Estimation producteur</span>
                  <span className={`font-semibold ${bestAfterDeadline ? 'text-red-700' : 'text-stone-900'}`}>{bestEstimatedStr}</span>
                </div>
                {bestAfterDeadline ? (
                  <p className="text-xs text-red-700 mt-2">Estimation au-delà de la date limite : clarifier avant attribution.</p>
                ) : null}
                {!bestEstimated ? (
                  <p className="text-xs text-stone-400 mt-2">Aucune estimation de livraison transmise pour l'instant.</p>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Content Grid ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Bid Form (col span 1) ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Send size={18} style={{ color: C.forest }} />
              <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: F.heading }}>Soumettre une offre</h2>
            </div>

            {isOpen ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="bid-price" className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
                    Prix par unité (FCFA)
                  </label>
                  <input
                    id="bid-price"
                    type="number"
                    min="1"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex: 250"
                    disabled={submitting}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
                    aria-label="Prix par unité"
                  />
                  {auction.maxPricePerUnit && (
                    <p className="text-xs text-stone-400 mt-1">Max : {auction.maxPricePerUnit} FCFA</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bid-estimated-delivery" className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
                    Estimation de livraison (optionnel)
                  </label>
                  <input
                    id="bid-estimated-delivery"
                    type="datetime-local"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    disabled={submitting}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
                    aria-label="Estimation de livraison"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !price}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? 'Envoi…' : 'Soumettre'}
                </button>

                <AnimatePresence>
                  {bidMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`text-xs font-medium px-3 py-2 rounded-lg ${
                        bidMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {bidMessage.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Shield size={28} className="text-stone-300" />
                <p className="text-sm text-stone-500">
                  {expired ? 'Le délai de cette enchère est expiré.' : 'Cette enchère n\'accepte plus d\'offres.'}
                </p>
              </div>
            )}
          </motion.div>

          {/* ─── Producers List (col span 2) ────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users size={18} style={{ color: C.forest }} />
                <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: F.heading }}>
                  Producteurs ciblés
                </h2>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                  {producers.length}
                </span>
              </div>
              <button
                onClick={loadData}
                className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Rafraîchir la liste"
              >
                <RefreshCw size={16} className="text-stone-500" />
              </button>
            </div>

            {producers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                <Users size={32} className="text-stone-200" />
                <p className="text-sm text-stone-400">Aucun producteur éligible trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {producers.map((p, idx) => {
                  const geo = geoPriorityLabel(p.geoPriority);
                  const score = p.trustScore?.globalScore;
                  return (
                    <motion.div
                      key={p.producerId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * idx }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all"
                    >
                      {/* Avatar */}
                      <div
                        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
                      >
                        {(p.name?.[0] ?? '?').toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{p.name || 'Producteur'}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`${geo.color} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                            {geo.text}
                          </span>
                          {p.hasBid && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Offre soumise
                            </span>
                          )}
                          {score != null && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Star size={10} /> {score.toFixed(1)}
                            </span>
                          )}
                          {p.hasMatchingProduct === true && (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Stock dispo
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
