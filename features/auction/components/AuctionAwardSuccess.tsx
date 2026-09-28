'use client';

import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { C, F } from '@/features/auction/utils/auction-tokens';

export interface AwardOutcome {
  producerName: string;
  pricingLabel: string | null;
  quantityLabel: string | null;
  totalAmount: string;
  auctionStatus: string;
  idempotent: boolean;
}

/** Bandeau de succès après attribution — les valeurs viennent de la réponse serveur (`awardAuction`), pas d'un
 * état local reconstruit : ce que l'acheteur voit ici est ce qui a été réellement écrit. */
export default function AuctionAwardSuccess({ outcome }: { outcome: AwardOutcome }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
      data-testid="award-success"
    >
      <div className="flex items-center gap-2 mb-2">
        <PartyPopper size={18} className="text-emerald-700" />
        <h3 className="text-sm font-bold text-emerald-900" style={{ fontFamily: F.heading }}>
          {outcome.idempotent ? 'Cette enchère est déjà attribuée' : 'Enchère attribuée'}
        </h3>
      </div>
      <p className="text-sm text-emerald-900">
        Gagnant : <span className="font-bold">{outcome.producerName}</span>
        {outcome.pricingLabel && <> — {outcome.pricingLabel}</>}
        {outcome.quantityLabel && <> pour {outcome.quantityLabel}</>}
      </p>
      <p className="text-sm text-emerald-900 mt-1">
        Total : <span className="font-extrabold">{outcome.totalAmount} FCFA</span>
        <span className="ml-2 text-xs font-medium text-emerald-700" style={{ color: C.forest }}>
          Statut : {outcome.auctionStatus}
        </span>
      </p>
    </motion.div>
  );
}
