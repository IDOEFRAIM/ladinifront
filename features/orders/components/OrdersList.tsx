'use client';

import { Package } from 'lucide-react';
import { C, F } from '@/features/orders/components/list/orders-list.tokens';
import { Order } from '@/features/orders/components/list/orders-list.types';
import { OrderCard } from '@/features/orders/components/list/BuyerOrderCard';

export default function OrdersList({ orders }: { orders: Order[] }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted }}>
        <Package size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
        <p style={{ fontFamily: F.body, fontWeight: 600 }}>Aucune commande trouvée.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
