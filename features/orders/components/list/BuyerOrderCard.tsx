'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Phone, User, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { C, F } from '@/features/orders/components/list/orders-list.tokens';
import { Order } from '@/features/orders/components/list/orders-list.types';
import { STATUS_MAP, DELIVERY_STATUS_MAP } from '@/features/orders/components/list/orders-list.constants';
import { Badge, OTPDisplay, DeliveryMiniStepper, OrderItemRow } from '@/features/orders/components/list/OrderCardParts';

export function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const orderCfg = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const deliveryStatus = order.delivery?.status;
  const deliveryCfg = deliveryStatus ? (DELIVERY_STATUS_MAP[deliveryStatus] || DELIVERY_STATUS_MAP.PENDING) : null;
  const showOTP = order.delivery?.deliveryCode && deliveryStatus !== 'DELIVERED';

  return (
    <div style={{ background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      
      {/* Header : Ref & Prix */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>#{order.id.slice(-8)}</div>
          <div style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 900, color: C.forest }}>
            {Number(order.totalAmount).toLocaleString()} <small style={{ fontSize: 12 }}>CFA</small>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <Badge config={orderCfg} />
          {deliveryCfg && <Badge config={deliveryCfg} />}
        </div>
      </div>

      {/* Tracking / OTP Section */}
      {order.delivery && (
        <div style={{ background: C.sand, borderRadius: 18, padding: 12, marginBottom: 16, border: `1px dashed ${C.border}` }}>
          <DeliveryMiniStepper status={order.delivery.status} />
          {showOTP && <div style={{ marginTop: 8 }}><OTPDisplay code={order.delivery.deliveryCode!} /></div>}
        </div>
      )}

      {/* Expand Toggle */}
      <button 
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', borderTop: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
      >
        {expanded ? <><ChevronUp size={14} /> Moins d'infos</> : <><ChevronDown size={14} /> Détails de la commande</>}
      </button>

      {expanded && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Panier */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 12 }}>Articles</div>
            <ul style={{ padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {order.items.map(it => <OrderItemRow key={it.id} item={it} />)}
            </ul>
          </div>

          {/* Info Livraison */}
          <div style={{ padding: 16, background: C.sand, borderRadius: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <MapPin size={14} color={C.emerald} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>{order.city || 'Adresse de livraison'}</span>
             </div>
             <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{order.deliveryDesc}</div>
             
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.forest, fontWeight: 600 }}>
                  <User size={12} /> {order.customerName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.amber, fontWeight: 700 }}>
                  <Phone size={12} /> {order.customerPhone}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Lien vers Tracking temps réel */}
      {order.delivery && order.delivery.status !== 'DELIVERED' && (
        <div style={{ marginTop: 16 }}>
          <Link href={`/tracking/${order.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 14, background: C.forest, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
            <Eye size={16} /> Suivre le livreur en direct
          </Link>
        </div>
      )}
    </div>
  );
}

// --- Liste principale ---
