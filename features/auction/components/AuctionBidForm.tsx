'use client';

import type { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, Shield } from 'lucide-react';
import { C, F } from '@/features/auction/utils/auction-tokens';

export interface BidMessage {
  type: 'success' | 'error';
  text: string;
}

interface Props {
  isOpen: boolean;
  expired: boolean;
  maxPricePerUnit: number | null;
  price: string;
  onPriceChange: (value: string) => void;
  estimatedDeliveryDate: string;
  onEstimatedDeliveryDateChange: (value: string) => void;
  submitting: boolean;
  bidMessage: BidMessage | null;
  onSubmit: (e: FormEvent) => void;
}

export default function AuctionBidForm({
  isOpen, expired, maxPricePerUnit, price, onPriceChange, estimatedDeliveryDate,
  onEstimatedDeliveryDateChange, submitting, bidMessage, onSubmit,
}: Props) {
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
            <label htmlFor="bid-price" className="text-xs font-bold text-stone-500 uppercase tracking-wide block mb-1.5">
              Prix par unité (FCFA)
            </label>
            <input
              id="bid-price"
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="Ex: 250"
              disabled={submitting}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors disabled:opacity-50"
              aria-label="Prix par unité"
            />
            {maxPricePerUnit && (
              <p className="text-xs text-stone-400 mt-1">Max : {maxPricePerUnit} FCFA</p>
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
