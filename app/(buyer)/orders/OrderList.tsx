'use client';

import React from 'react';
import { Package, MapPin, Phone, User } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

interface OrderItem { id: string; product: { name: string; unit?: string; images?: string[] }; quantity: number; priceAtSale: number; }
interface Order { id: string; totalAmount: number; createdAt: string; items: OrderItem[]; city?: string | null; deliveryDesc?: string | null; customerName: string; customerPhone: string; }

const OrderItemRow = ({ item }: { item: OrderItem }) => {
  const img = item.product?.images?.[0];
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0, background: C.sand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img ? <img src={typeof img === 'string' ? img : '/icons/box.svg'} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} color={C.muted} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.9rem', color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product.name || 'Article'}</div>
        <div style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted }}>{item.quantity} {item.product.unit || ''} &bull; {item.priceAtSale.toLocaleString()} CFA</div>
      </div>
    </li>
  );
};

export default function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orders.map((order) => (
        <div key={order.id} style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 24, transition: 'box-shadow 0.2s' }}>
          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <span style={{ fontFamily: F.body, fontSize: '0.65rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1.5, display: 'block', marginBottom: 4 }}>REF: #{order.id.substring(0, 8)}</span>
              <div style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 900, color: C.forest }}>
                {order.totalAmount.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>CFA</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontFamily: F.body, fontSize: '0.8rem', fontWeight: 600, color: C.muted }}>
                {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontFamily: F.body, fontSize: '0.7rem', color: C.muted, opacity: 0.7 }}>
                {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Content grid */}
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 24 }}>
            <div>
              <h4 style={{ fontFamily: F.body, fontSize: '0.65rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber }} /> Panier
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.items.map(it => <OrderItemRow key={it.id} item={it} />)}
              </ul>
            </div>

            <div style={{ background: C.sand, padding: 18, borderRadius: 18, border: `1px solid ${C.border}` }}>
              <h4 style={{ fontFamily: F.body, fontSize: '0.65rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald }} /> Livraison
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.85rem', color: C.forest, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> Destination</div>
                  <div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>{order.city || order.deliveryDesc || 'Adresse non precisee'}</div>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.body, fontSize: '0.8rem' }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> Destinataire</span>
                    <span style={{ fontWeight: 700, color: C.forest }}>{order.customerName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.body, fontSize: '0.8rem' }}>
                    <span style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={12} /> Telephone</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: C.amber }}>{order.customerPhone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
