// @/components/orders/OrderSummary.tsx
import { FaReceipt } from 'react-icons/fa';

export const OrderSummary = ({ items, deliveryFee }: { items: any[], deliveryFee: number }) => {
  const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  return (
    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100">
      <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <FaReceipt size={10} /> Détails Panier
      </h3>
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-xs font-black text-slate-800 uppercase italic">
              {item.name} <span className="text-[9px] not-italic text-slate-400 ml-1">x{item.quantity}</span>
            </span>
            <span className="font-black text-slate-900">{item.price.toLocaleString()} F</span>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 rounded-[2rem] p-5 space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
          <span>Livraison</span><span>{deliveryFee.toLocaleString()} F</span>
        </div>
        <div className="flex justify-between items-end pt-2 border-t border-slate-200/50">
          <span className="text-xs font-black text-slate-900 uppercase italic">Net à payer</span>
          <span className="text-2xl font-black text-green-600">{(subTotal + deliveryFee).toLocaleString()} F</span>
        </div>
      </div>
    </div>
  );
};