"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const UNIT_LABELS: Record<string, string> = { UNIT: 'unité', KG: 'kg', TONNE: 'tonne', LITRE: 'litre', L: 'L', SAC: 'sac' };

/** « 45000.00 » → « 45 000 » ; « 15.000 » → « 15 ». Valeurs non numériques renvoyées telles quelles. */
function fmtNumber(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(value ?? '');
}

function unitLabel(unit: unknown, quantity: unknown): string {
  const base = UNIT_LABELS[String(unit ?? '').toUpperCase()] ?? String(unit ?? '').toLowerCase();
  const plural = base === 'unité' || base === 'sac' || base === 'tonne' || base === 'litre';
  return plural && Number(quantity) > 1 ? `${base}s` : base;
}

export default function AuctionCard({ auction }: { auction: any }) {
  const bids = Number(auction.bidsCount) || 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="flex flex-col bg-white rounded-2xl p-5 sm:p-6 border border-emerald-900/5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-[#064E3B] leading-snug">{auction.subCategoryName || 'Produit'}</h3>
        {auction.autoExtend ? (
          <span className="shrink-0 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg" title="La date limite se prolonge si une offre arrive dans les dernières minutes">Anti-snipe</span>
        ) : null}
      </div>

      <p className="mt-2 text-slate-600">
        <span className="font-semibold text-slate-800">{fmtNumber(auction.quantity)} {unitLabel(auction.unit, auction.quantity)}</span>
        <span className="text-slate-400"> · </span>
        prix max <span className="font-semibold text-slate-800 whitespace-nowrap">{fmtNumber(auction.maxPricePerUnit)}&nbsp;FCFA</span>/{unitLabel(auction.unit, 1)}
      </p>

      <Countdown deadline={auction.deadline} />

      {auction.escrowStatus && auction.escrowStatus !== 'NONE' ? (
        <span className="mt-2 self-start text-xs font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded-lg">Escrow : {String(auction.escrowStatus)}</span>
      ) : null}

      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{bids === 0 ? 'Aucune offre' : `${bids} offre${bids > 1 ? 's' : ''}`}</span>
        <Link
          href={`/auction/${auction.id}`}
          className="inline-flex items-center justify-center min-h-[44px] bg-[#064E3B] text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#0a6b52] active:scale-[0.98] transition"
        >
          Voir l&apos;enchère
        </Link>
      </div>
    </motion.div>
  );
}

// Le timer reste ici car il a besoin du cycle de vie client
function Countdown({ deadline }: { deadline: string | Date }) {
  // `null` au rendu serveur ET au premier rendu client : l'heure du serveur et celle du navigateur diffèrent, l'afficher
  // avant montage provoquait une erreur d'hydratation. On réserve la hauteur pour éviter tout saut de mise en page.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0); // hors du corps de l'effet : pas de setState synchrone (rendu en cascade)
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  if (!now) return <div className="mt-3 h-6" aria-hidden="true" />;

  const d = new Date(deadline);
  const diff = Math.max(0, d.getTime() - now.getTime());

  if (diff === 0) return <div className="mt-3 text-red-600 font-bold">Terminée</div>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  // Moins d'une heure : le compte à rebours passe en orange pour signaler l'urgence.
  const urgent = diff < 60 * 60 * 1000;
  const parts = [days > 0 ? `${days} j` : null, days > 0 || hours > 0 ? `${hours} h` : null, `${String(minutes).padStart(2, '0')} min`, `${String(seconds).padStart(2, '0')} s`].filter(Boolean);

  return (
    <div className={`mt-3 inline-flex items-center gap-2 font-bold tabular-nums ${urgent ? 'text-amber-600' : 'text-emerald-700'}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${urgent ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
      <span>{parts.join(' ')} <span className="font-medium text-slate-500">restants</span></span>
    </div>
  );
}
