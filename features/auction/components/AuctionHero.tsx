'use client';

import { motion } from 'framer-motion';
import { Gavel, Clock, TrendingUp, MapPin, Shield } from 'lucide-react';
import type { Auction } from '@/features/auction/types/auction.types';
import { statusConfig } from '@/features/auction/utils/auction-format';
import { C, F } from '@/features/auction/utils/auction-tokens';

interface Props {
  auction: Auction;
  remaining: string;
  deadlinePulse: boolean;
  escrowVerified: boolean;
}

export default function AuctionHero({ auction, remaining, deadlinePulse, escrowVerified }: Props) {
  const status = statusConfig[auction.status] ?? statusConfig.CLOSED;
  return (
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
  );
}
