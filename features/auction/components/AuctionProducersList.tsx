'use client';

import { motion } from 'framer-motion';
import { Users, RefreshCw, Star } from 'lucide-react';
import type { ProducerItem } from '@/features/auction/types/auction.types';
import { geoPriorityLabel } from '@/features/auction/utils/auction-format';
import { C, F } from '@/features/auction/utils/auction-tokens';

interface Props {
  producers: ProducerItem[];
  onRefresh: () => void;
}

export default function AuctionProducersList({ producers, onRefresh }: Props) {
  return (
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
          onClick={onRefresh}
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
  );
}
