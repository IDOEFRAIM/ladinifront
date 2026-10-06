'use client';

import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, Shield } from 'lucide-react';
import { C, F } from '@/features/auction/utils/auction-tokens';
import { unitDisplay } from '@/features/auction/pricing/units';

export interface BidMessage {
  type: 'success' | 'error';
  text: string;
}

/** PER_BASE_UNIT (« 450 000 FCFA par tonne ») | TOTAL_LOT (« 4 200 000 FCFA pour tout le lot »).
 * PER_PACKAGE n'est délibérément pas proposé sur le web dans cette phase (Phase B2c.1, voir B4/B26). */
export type BidBasis = 'PER_BASE_UNIT' | 'TOTAL_LOT';

interface Props {
  isOpen: boolean;
  expired: boolean;
  maxPricePerUnit: number | null;
  auctionUnit: string;
  basis: BidBasis;
  onBasisChange: (value: BidBasis) => void;
  price: string;
  onPriceChange: (value: string) => void;
  estimatedDeliveryDate: string;
  onEstimatedDeliveryDateChange: (value: string) => void;
  submitting: boolean;
  bidMessage: BidMessage | null;
  onSubmit: (e: FormEvent) => void;
}

export default function AuctionBidForm({
  isOpen, expired, maxPricePerUnit, auctionUnit, basis, onBasisChange, price, onPriceChange, estimatedDeliveryDate,
  onEstimatedDeliveryDateChange, submitting, bidMessage, onSubmit,
}: Props) {
  const unitLabel = unitDisplay(auctionUnit);
  return (
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
              Ce prix est
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Base du prix">
              <button
                type="button"
                disabled={submitting}
                aria-pressed={basis === 'PER_BASE_UNIT'}
                onClick={() => onBasisChange('PER_BASE_UNIT')}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${
                  basis === 'PER_BASE_UNIT' ? 'border-green-600 bg-green-50 text-green-800' : 'border-stone-300 text-stone-600'
                }`}
              >
                Par {unitLabel}
              </button>
              <button
                type="button"
                disabled={submitting}
                aria-pressed={basis === 'TOTAL_LOT'}
                onClick={() => onBasisChange('TOTAL_LOT')}
                className={`py-2 px-3 rounded-lg text-sm font-semibold border transition-colors ${
                  basis === 'TOTAL_LOT' ? 'border-green-600 bg-green-50 text-green-800' : 'border-stone-300 text-stone-600'
                }`}
              >
                Pour tout le lot
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="bid-price" className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
              {basis === 'TOTAL_LOT' ? 'Montant pour tout le lot (FCFA)' : `Prix par ${unitLabel} (FCFA)`}
            </label>
            <input
              id="bid-price"
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder={basis === 'TOTAL_LOT' ? 'Ex: 4 200 000' : 'Ex: 450 000'}
              disabled={submitting}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
              aria-label={basis === 'TOTAL_LOT' ? 'Montant pour tout le lot' : 'Prix par unité'}
            />
            {maxPricePerUnit && (
              <p className="text-xs text-stone-400 mt-1">Plafond : {maxPricePerUnit} FCFA par {unitLabel}</p>
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
              onChange={(e) => onEstimatedDeliveryDateChange(e.target.value)}
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
  );
}
