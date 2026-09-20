'use client';

import { Truck, Gavel, TrendingUp, Clock } from 'lucide-react';
import { C, F, Card, formatXof } from '@/features/orders/components/dashboard/dashboard-ui';

import type { BuyerActiveOrder, BuyerAuctionSummary, BuyerBillingSummary } from '@/features/buyer/types/buyer-dashboard.types';
import type { BuyerPreorder } from '@/features/orders/services/preorder.service';

interface Props {
  activeOrders: BuyerActiveOrder[];
  auctions: BuyerAuctionSummary;
  billingSummary: BuyerBillingSummary | null;
  preorders: BuyerPreorder[];
}

export default function StatCards({ activeOrders, auctions, billingSummary, preorders }: Props) {
  return (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
    <Card style={{ borderLeft: `4px solid ${C.amber}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Livraisons en transit</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.forest, marginTop: 4 }}>
            {activeOrders.filter((o) => o.delivery?.status === 'IN_TRANSIT').length}
          </div>
        </div>
        <Truck size={24} color={C.amber} />
      </div>
    </Card>
    <Card style={{ borderLeft: `4px solid ${C.emerald}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Enchères actives</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.forest, marginTop: 4 }}>{auctions?.active?.length || 0}</div>
        </div>
        <Gavel size={24} color={C.emerald} />
      </div>
    </Card>
    <Card style={{ borderLeft: `4px solid #7C3AED` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Factures du mois</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.forest, marginTop: 4 }}>
            {formatXof(billingSummary?.monthTotal)}
          </div>
        </div>
        <TrendingUp size={24} color="#7C3AED" />
      </div>
    </Card>
    <Card style={{ borderLeft: `4px solid ${C.red}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>Précommandes</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.forest, marginTop: 4 }}>{preorders.length}</div>
        </div>
        <Clock size={24} color={C.red} />
      </div>
    </Card>
  </div>
  );
}
