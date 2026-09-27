'use client';

import { motion } from 'framer-motion';
import { Truck, Info } from 'lucide-react';
import type { Auction, BidsApiResponse } from '@/features/auction/types/auction.types';
import { formatDateTime, incotermHelp } from '@/features/auction/utils/auction-format';
import { C, F } from '@/features/auction/utils/auction-tokens';

interface Props {
  auction: Auction;
  bidsData: BidsApiResponse | null;
  bidsLoading: boolean;
}

export default function AuctionLogistics({ auction, bidsData, bidsLoading }: Props) {
  const bestBid = bidsData?.bids?.find((b) => b.isBestBid) ?? null;
  const bestEstimated = bestBid?.estimatedDeliveryDate ?? null;
  const deliveryDeadlineStr = formatDateTime(auction.deliveryDeadline ?? null);
  const bestEstimatedStr = formatDateTime(bestEstimated);
  const bestAfterDeadline = (() => {
    const a = auction.deliveryDeadline ? new Date(auction.deliveryDeadline).getTime() : NaN;
    const b = bestEstimated ? new Date(bestEstimated).getTime() : NaN;
    return !isNaN(a) && !isNaN(b) && b > a;
  })();

  return (
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
  );
}
