'use client';

import { motion } from 'framer-motion';
import { Award, ShieldQuestion, Trophy } from 'lucide-react';
import type { Auction, AuctionBid } from '@/features/auction/types/auction.types';
import { unitDisplay } from '@/features/auction/pricing/units';
import { C, F } from '@/features/auction/utils/auction-tokens';

interface Props {
  auction: Auction;
  bids: AuctionBid[];
  loading: boolean;
  /** `true` pour le propriétaire (ou un admin) — pilote l'affichage du flux d'attribution ; le serveur
   * (`awardAuction`) reste seul autoritaire, ceci n'est qu'une commodité de rendu. */
  viewerCanAward: boolean;
  onSelectForAward: (bid: AuctionBid) => void;
}

/**
 * Liste des offres — CHAQUE bid affiche sa PROPRE sémantique commerciale (`pricingLabel`, `comparableTotal`),
 * jamais `${offeredPrice} FCFA/${auction.unit}` recalculé ici : ces valeurs viennent certifiées du service
 * (`services/auction-bid-queries.ts`). Un bid legacy (base inconnue) est affiché comme tel et n'a jamais de
 * bouton "Attribuer" actif, quel que soit son montant brut.
 */
export default function AuctionBidList({ auction, bids, loading, viewerCanAward, onSelectForAward }: Props) {
  const qty = auction.quantity != null ? Number(auction.quantity) : null;
  const qtyLabel = qty != null ? `${qty} ${unitDisplay(auction.unit, qty)}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 shadow-sm p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Award size={18} style={{ color: C.forest }} />
          <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: F.heading }}>Offres reçues</h2>
          <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">{bids.length}</span>
        </div>
        {loading && <span className="text-xs text-stone-400">Mise à jour…</span>}
      </div>

      {bids.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
          <Award size={28} className="text-stone-200" />
          <p className="text-sm text-stone-400">Aucune offre reçue pour l&apos;instant</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Liste des offres">
          {bids.map((bid, idx) => (
            <motion.li
              key={bid.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * idx }}
              className={`rounded-xl border p-4 ${bid.isWinner ? 'border-emerald-400 bg-emerald-50/60' : 'border-stone-100'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-stone-900 truncate">{bid.producerName || 'Producteur'}</p>
                    {bid.isWinner && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Trophy size={10} /> Gagnant
                      </span>
                    )}
                    {!bid.pricingCertified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <ShieldQuestion size={10} /> Non certifiée
                      </span>
                    )}
                  </div>

                  {/* Sémantique CERTIFIÉE du bid — jamais recalculée dans ce composant. */}
                  <p className="text-sm font-semibold mt-1" style={{ color: bid.pricingCertified ? C.forest : undefined }}>
                    {bid.pricingCertified ? bid.pricingLabel : 'Base de prix à préciser'}
                  </p>
                  {bid.pricingCertified && bid.comparableTotal && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      {qtyLabel && <>Pour {qtyLabel} — </>}
                      Total : <span className="font-bold text-stone-700">{bid.comparableTotal} FCFA</span>
                    </p>
                  )}
                  {!bid.pricingCertified && (
                    <p className="text-xs text-amber-700 mt-0.5">
                      Le producteur doit préciser si ce prix est par unité ou pour tout le lot avant de pouvoir être retenu.
                    </p>
                  )}
                </div>

                {viewerCanAward && auction.status === 'OPEN' && !bid.isWinner && (
                  <button
                    type="button"
                    disabled={!bid.awardable}
                    onClick={() => onSelectForAward(bid)}
                    title={bid.awardable ? undefined : 'Base de prix non certifiée ou non comparable à cette enchère'}
                    className="shrink-0 px-4 py-2 rounded-full text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105"
                    style={{ background: bid.awardable ? `linear-gradient(135deg, ${C.forest}, ${C.emerald})` : '#a8a29e' }}
                  >
                    Attribuer
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
