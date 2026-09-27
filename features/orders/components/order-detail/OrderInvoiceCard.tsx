'use client';

import { FaReceipt } from 'react-icons/fa';
import { OrderSummary } from '@/features/orders/components/OrderSummary';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  items: any[];
  deliveryFee: number;
  subTotal: number;
  totalAmount: number;
}

export default function OrderInvoiceCard({ items, deliveryFee, subTotal, totalAmount }: Props) {
  return (
  <div className="bg-white rounded-[2rem] p-6 border border-[#E0E0D1] shadow-sm space-y-4">
    <h3 className="text-[10px] font-black text-[#A4A291] uppercase tracking-wider flex items-center gap-2">
      <FaReceipt className="text-stone-500" /> Facturation Articles
    </h3>
    
    <OrderSummary items={items} deliveryFee={deliveryFee} />

    <div className="pt-4 border-t border-dashed border-[#E0E0D1] space-y-2 text-xs">
      <div className="flex justify-between text-[#A4A291]">
        <span>Sous-total Panier</span>
        <span className="font-bold">{subTotal.toLocaleString()} F</span>
      </div>
      <div className="flex justify-between text-[#A4A291]">
        <span>Frais de transport</span>
        <span className="font-bold">+{deliveryFee.toLocaleString()} F</span>
      </div>
      <div className="flex justify-between text-[#5B4636] text-base font-black pt-2 border-t border-[#E0E0D1]">
        <span>Total Net</span>
        <span className="text-[#497A3A] italic">{totalAmount.toLocaleString()} F</span>
      </div>
    </div>
  </div>
  );
}
