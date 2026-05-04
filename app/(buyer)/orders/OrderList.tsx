'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, MapPin, Phone, User, Truck, Clock, CheckCircle2, XCircle, Eye, ShieldCheck, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', red:'#DC2626', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

interface OrderItem { id: string; product: { name: string; unit?: string; images?: string[] }; quantity: number; priceAtSale: number; }
interface Delivery { id: string; status: string; deliveryCode?: string | null; estimatedDistanceKm?: number | null; assignedAt?: string | null; pickedUpAt?: string | null; deliveredAt?: string | null; }
interface Order { id: string; totalAmount: number; status: string; createdAt: string; items: OrderItem[]; city?: string | null; deliveryDesc?: string | null; customerName: string; customerPhone: string; deliveryStatus?: string | null; delivery?: Delivery | null; }

const STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente', icon: Clock },
  CONFIRMED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Confirmée', icon: CheckCircle2 },
  PAID: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Payée', icon: CheckCircle2 },
  SHIPPED: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'Expédiée', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livrée', icon: CheckCircle2 },
  CANCELLED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Annulée', icon: XCircle },
};

const DELIVERY_STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente livreur', icon: Clock },
  ASSIGNED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Livreur assigné', icon: User },
  IN_TRANSIT: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'En route', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livré', icon: CheckCircle2 },
  FAILED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Échouée', icon: XCircle },
};

function Badge({ config }: { config: { color: string; bg: string; label: string; icon: any } }) {
  const Icon = config.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, background: config.bg, color: config.color, fontSize: 11, fontWeight: 700, fontFamily: F.body }}>
      <Icon size={11} /> {config.label}
    </span>
  );
}

function OTPDisplay({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12, background: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)', color: '#fff' }}>
      <ShieldCheck size={14} style={{ opacity: 0.8 }} />
      <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 }}>Code OTP</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 800, letterSpacing: 4 }}>{code}</span>
      <button onClick={copy} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: F.body }}>
        {copied ? <><Check size={10} /> Copié</> : <><Copy size={10} /> Copier</>}
      </button>
    </div>
  );
}

const DeliveryMiniStepper = ({ status }: { status: string }) => {
  const steps = [
    { key: 'PENDING', label: 'Attente' },
    { key: 'ASSIGNED', label: 'Assigné' },
    { key: 'IN_TRANSIT', label: 'En route' },
    { key: 'DELIVERED', label: 'Livré' },
  ];
  const currentIdx = steps.findIndex(s => s.key === status);
  const isFailed = status === 'FAILED';

  if (isFailed) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
      <XCircle size={14} color={C.red} />
      <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, color: C.red }}>Livraison échouée</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '6px 0' }}>
      {steps.map((step, i) => {
        const reached = i <= currentIdx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <div style={{ flex: 1, height: 2, borderRadius: 1, background: reached ? C.emerald : C.border, minWidth: 16, transition: 'background 0.3s' }} />}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: reached ? C.emerald : C.border, transition: 'background 0.3s', flexShrink: 0 }} title={step.label} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const OrderItemRow = ({ item }: { item: OrderItem }) => {
  const img = item.product?.images?.[0];
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0, background: C.sand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img ? <img src={typeof img === 'string' ? img : '/icons/box.svg'} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} color={C.muted} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.9rem', color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name || 'Article'}</div>
        <div style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted }}>{item.quantity} {item.product?.unit || ''} &bull; {item.priceAtSale.toLocaleString()} CFA</div>
      </div>
    </li>
  );
};

function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const orderCfg = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
  const hasDelivery = !!order.delivery;
  const deliveryCfg = hasDelivery ? (DELIVERY_STATUS_MAP[order.delivery!.status] || DELIVERY_STATUS_MAP.PENDING) : null;
  const showOTP = hasDelivery && order.delivery!.deliveryCode && order.delivery!.status !== 'DELIVERED';

  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 24, transition: 'box-shadow 0.2s' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <div>
          <span style={{ fontFamily: F.body, fontSize: '0.65rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1.5, display: 'block', marginBottom: 4 }}>REF: #{order.id.substring(0, 8)}</span>
          <div style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 900, color: C.forest }}>
            {Number(order.totalAmount).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>CFA</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' as const, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontFamily: F.body, fontSize: '0.8rem', fontWeight: 600, color: C.muted }}>
            {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <Badge config={orderCfg} />
          {deliveryCfg && <Badge config={deliveryCfg} />}
        </div>
      </div>

      {/* Delivery stepper */}
      {hasDelivery && (
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
          <DeliveryMiniStepper status={order.delivery!.status} />
          {order.delivery!.estimatedDistanceKm && (
            <span style={{ fontFamily: F.body, fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin size={11} /> {order.delivery!.estimatedDistanceKm} km estimés
            </span>
          )}
        </div>
      )}

      {/* OTP code */}
      {showOTP && (
        <div style={{ marginBottom: 14 }}>
          <OTPDisplay code={order.delivery!.deliveryCode!} />
        </div>
      )}

      {/* Expand toggle */}
      <button onClick={() => setExpanded(!expanded)} style={{
        display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 0', border: 'none', background: 'transparent', cursor: 'pointer',
        fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.muted, justifyContent: 'center',
        borderBottom: expanded ? `1px solid ${C.border}` : 'none', marginBottom: expanded ? 14 : 0,
      }}>
        {expanded ? <><ChevronUp size={14} /> Masquer les détails</> : <><ChevronDown size={14} /> Voir les détails</>}
      </button>

      {expanded && (
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
      )}

      {/* Tracking link */}
      {hasDelivery && order.delivery!.status !== 'DELIVERED' && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <Link href={`/tracking/${order.id}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 100,
            background: 'rgba(16,185,129,0.06)', color: C.emerald, fontFamily: F.body, fontSize: 13, fontWeight: 700, textDecoration: 'none',
            border: `1px solid rgba(16,185,129,0.15)`, transition: 'all 0.2s',
          }}>
            <Eye size={15} /> Suivre la livraison en temps réel
          </Link>
        </div>
      )}
    </div>
  );
}

export default function OrdersList({ orders }: { orders: Order[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {orders.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}
