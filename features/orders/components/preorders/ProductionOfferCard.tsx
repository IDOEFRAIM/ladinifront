'use client';

import { Loader2, CalendarClock, PackageCheck, ShoppingBag } from 'lucide-react';
import type { PublicProduction } from '@/features/production/services/production.service';

interface Props {
  production: PublicProduction;
  isOpen: boolean;
  qty: string;
  onQtyChange: (value: string) => void;
  submitting: boolean;
  onOpen: () => void;
  onSubmit: () => void;
}

export default function ProductionOfferCard({ production: p, isOpen, qty, onQtyChange, submitting, onOpen, onSubmit }: Props) {
  const remaining = p.availableQuantity - p.reservedQuantity;
  return (
  <div className="bg-white rounded-2xl border border-emerald-900/5 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="font-bold text-slate-800">{p.productLabel}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{p.producer?.businessName ?? p.farm.name}</p>
      </div>
      {p.pricePerUnit !== null && (
        <span className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
          {p.pricePerUnit.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">XOF/{p.unit}</span>
        </span>
      )}
    </div>

    <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
      <span className="flex items-center gap-1">
        <PackageCheck className="w-3.5 h-3.5 text-emerald-600" /> {remaining} {p.unit} dispo.
      </span>
      {p.estimatedAvailableAt && (
        <span className="flex items-center gap-1">
          <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
          {new Date(p.estimatedAvailableAt).toLocaleDateString('fr-FR')}
        </span>
      )}
    </div>

    {isOpen ? (
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={qty}
          onChange={(e) => onQtyChange(e.target.value)}
          placeholder={`Quantité (${p.unit})`}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
        />
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
          Réserver
        </button>
      </div>
    ) : (
      <button
        onClick={onOpen}
        disabled={remaining <= 0 || p.pricePerUnit === null}
        className="mt-3 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold disabled:opacity-50"
      >
        {remaining <= 0 ? 'Complet' : 'Précommander'}
      </button>
    )}
  </div>
  );
}
