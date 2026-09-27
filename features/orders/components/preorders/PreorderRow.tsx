'use client';

import { Trash2 } from 'lucide-react';
import type { BuyerPreorder } from '@/features/orders/services/preorder.service';
import { StatusBadge } from '@/features/orders/components/preorders/preorder-ui';

interface Props {
  order: BuyerPreorder;
  onAdjust: () => void;
  onCancel: () => void;
}

export default function PreorderRow({ order: o, onAdjust, onCancel }: Props) {
  return (
  <div className="bg-white rounded-2xl border border-emerald-900/5 p-4 shadow-sm flex items-center justify-between gap-3">
    <div>
      <h3 className="font-bold text-slate-800">{o.marketOffer?.productLabel ?? 'Production'}</h3>
      <p className="text-xs text-slate-500 mt-0.5">
        {o.marketOffer?.estimatedAvailableAt
          ? `Disponible le ${new Date(o.marketOffer.estimatedAvailableAt).toLocaleDateString('fr-FR')}`
          : 'Date à confirmer'}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{o.quantity} {o.marketOffer ? 'unités' : ''} à {o.unitPrice.toLocaleString()} XOF</p>
      <div className="flex gap-2 mt-2 text-xs">
        <button
          onClick={() => onAdjust()}
          disabled={Boolean(o.preorderConvertedAt)}
          className="px-3 py-1 rounded-full border border-emerald-200 text-emerald-700 disabled:opacity-50"
        >
          Ajuster
        </button>
        <button
          onClick={() => onCancel()}
          disabled={Boolean(o.preorderConvertedAt)}
          className="px-3 py-1 rounded-full border border-red-200 text-red-600 flex items-center gap-1 disabled:opacity-50"
        >
          <Trash2 size={14} /> Annuler
        </button>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-extrabold text-emerald-700">
        {o.totalAmount.toLocaleString()} <span className="text-[10px] text-slate-400">{o.currency}</span>
      </p>
      <StatusBadge status={o.status} converted={Boolean(o.preorderConvertedAt)} />
    </div>
  </div>
  );
}
