'use client';

import { C, F } from '@/features/orders/components/tracking/tracking-ui';

import type { TrackingItem, TrackingResponse } from '@/features/buyer/types/tracking.types';

interface Props {
  items: TrackingItem[] | undefined;
  order: TrackingResponse['order'] | undefined;
}

export default function ParcelSummary({ items, order }: Props) {
  return (
<div style={{ background: C.glass, backdropFilter: 'blur(10px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20 }}>
  <button 
    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'default' }}
  >
    <span style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest }}>Contenu du colis</span>
    <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{items?.length} articles</span>
  </button>
  
  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
    {items?.map((item: any) => (
      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.emerald }} />
          <span style={{ fontFamily: F.body, fontSize: 14, color: C.text }}>
            <span style={{ fontWeight: 700 }}>{item.quantity}x</span> {item.product?.name}
          </span>
        </div>
        <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.muted }}>
          {(item.quantity * item.priceAtSale).toLocaleString()} CFA
        </span>
      </div>
    ))}
    
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>Total réglé</span>
      <span style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 900, color: C.emerald }}>
        {Number(order?.totalAmount).toLocaleString()} <small style={{ fontSize: 12 }}>CFA</small>
      </span>
    </div>
  </div>
</div>
  );
}
