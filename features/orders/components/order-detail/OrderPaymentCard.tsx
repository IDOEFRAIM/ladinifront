'use client';

import { FaMoneyBillWave } from 'react-icons/fa';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  order: any;
}

export default function OrderPaymentCard({ order }: Props) {
  return (
  <div className="bg-white rounded-[2rem] p-6 border border-[#E0E0D1] shadow-sm space-y-4">
    <h3 className="text-[10px] font-black text-[#A4A291] uppercase tracking-wider flex items-center gap-2">
      <FaMoneyBillWave className="text-[#497A3A]" /> Règlement & Expédition
    </h3>
    <div className="grid grid-cols-2 gap-4 text-xs">
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <span className="block text-[9px] text-[#A4A291] uppercase font-bold">Méthode</span>
        <span className="font-black text-[#5B4636]">{order.paymentMethod || 'CASH À LA LIVRAISON'}</span>
      </div>
      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <span className="block text-[9px] text-[#A4A291] uppercase font-bold">Statut Paiement</span>
        <span className={`font-black uppercase text-[10px] ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-amber-600'}`}>
          {order.paymentStatus === 'PAID' ? 'Payé' : 'En attente'}
        </span>
      </div>
    </div>
    {order.deliveryDesc && (
      <div className="p-4 bg-stone-50 rounded-2xl text-xs text-[#5B4636] italic border border-stone-150">
        <span className="block text-[9px] font-black text-[#A4A291] uppercase tracking-wide not-italic mb-1">Directives de livraison :</span>
        "{order.deliveryDesc}"
      </div>
    )}
  </div>
  );
}
