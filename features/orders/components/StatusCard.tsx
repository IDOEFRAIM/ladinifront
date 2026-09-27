// @/components/orders/StatusBadge.tsx
import { OrderStatus } from '@/types/inferred';

export const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const configs: Record<OrderStatus, string> = {
    PENDING: "bg-amber-100 text-amber-600 border-amber-200",
    STOCK_RESERVED: "bg-blue-100 text-blue-600 border-blue-200",
    AWAITING_PAYMENT: "bg-orange-100 text-orange-600 border-orange-200",
    PAID: "bg-green-100 text-green-600 border-green-200",
    DELIVERED: "bg-stone-100 text-stone-600 border-stone-200",
    COMPLETED: "bg-green-200 text-green-800 border-green-300",
    CANCELED: "bg-red-100 text-red-600 border-red-200",
    FAILED: "bg-red-200 text-red-700 border-red-300",
  };

  const labels: Record<OrderStatus, string> = {
    PENDING: "En attente",
    STOCK_RESERVED: "Stock réservé",
    AWAITING_PAYMENT: "Paiement attendu",
    PAID: "Payé",
    DELIVERED: "Livré",
    COMPLETED: "Terminé",
    CANCELED: "Annulé",
    FAILED: "Échoué",
  };

  return (
    <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${configs[status] || 'bg-stone-100 text-stone-600 border-stone-200'}`}>
      {labels[status] || status}
    </span>
  );
};