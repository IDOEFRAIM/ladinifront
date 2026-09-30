'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Handshake, Loader2, X } from 'lucide-react';
import type { Auction } from '@/features/auction/types/auction.types';
import { unitDisplay } from '@/features/auction/pricing/units';
import { C, F } from '@/features/auction/utils/auction-tokens';

export interface AwardTarget {
  bidId: string;
  producerName: string;
  pricingLabel: string;
  comparableTotal: string;
  /** Empreinte CAPTURÉE au moment de la sélection — c'est elle qui est envoyée à `awardAuction`, jamais
   * recalculée ici. Si le bid change avant la confirmation, le serveur la rejette (`award_terms_changed`). */
  fingerprint: string;
}

interface Props {
  auction: Auction;
  target: AwardTarget | null;
  submitting: boolean;
  /** Message d'erreur à afficher DANS la modale (ex: termes périmés) — `null` referme silencieusement. */
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * "Ce que l'acheteur voit == ce que le serveur attribue" : la modale n'affiche QUE des valeurs certifiées
 * (`target.pricingLabel`/`comparableTotal`/`fingerprint`) transmises depuis la liste des offres — jamais un
 * recalcul local. `awardAuction` revalide `fingerprint` sous verrou avant d'écrire quoi que ce soit.
 */
export default function AuctionAwardConfirm({ auction, target, submitting, error, onCancel, onConfirm }: Props) {
  const qty = auction.quantity != null ? Number(auction.quantity) : null;
  const qtyLabel = qty != null && auction.unit ? `${qty} ${unitDisplay(auction.unit, qty)}` : null;

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmer l'attribution de l'enchère"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Handshake size={18} style={{ color: C.forest }} />
                <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: F.heading }}>
                  Confirmer l&apos;attribution
                </h2>
              </div>
              <button onClick={onCancel} disabled={submitting} className="p-1 rounded-lg hover:bg-stone-100 text-stone-400" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-stone-600">
                Attribuer cet appel d&apos;offres à <span className="font-bold text-stone-900">{target.producerName}</span> ?
              </p>

              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 space-y-2">
                <Row label="Offre" value={target.pricingLabel} />
                {qtyLabel && <Row label="Quantité de l'appel d'offres" value={qtyLabel} />}
                <Row label="Total" value={`${target.comparableTotal} FCFA`} emphasize />
              </div>

              <p className="text-xs text-stone-400">
                Cette action clôture l&apos;appel d&apos;offres et crée la commande. Les autres offres seront marquées perdantes.
              </p>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-700"
                  >
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200">
              <button
                onClick={onCancel}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full text-sm font-bold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-105 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Handshake size={14} />}
                {submitting ? 'Attribution…' : "Confirmer l'attribution"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">{label}</span>
      <span className={emphasize ? 'text-base font-extrabold text-stone-900' : 'text-sm font-semibold text-stone-800'}>{value}</span>
    </div>
  );
}
