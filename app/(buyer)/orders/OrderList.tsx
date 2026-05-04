'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Package, MapPin, Phone, User, Truck, Clock, 
  CheckCircle2, XCircle, Eye, ShieldCheck, 
  Copy, Check, ChevronDown, ChevronUp 
} from 'lucide-react';

// Configuration du thème
const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  red:'#DC2626', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.72)', 
  border:'rgba(6,78,59,0.07)', 
  muted:'#64748B', 
  text:'#1F2937' 
};

const F = { 
  heading:"'Space Grotesk', sans-serif", 
  body:"'Inter', sans-serif" 
};

// Types & Interfaces
interface OrderItem { 
  id: string; 
  product: { name: string; unit?: string | null; images?: string[] | null }; 
  quantity: number; 
  priceAtSale: number; 
}

interface Delivery { 
  id: string; 
  status: string; 
  deliveryCode?: string | null; 
  estimatedDistanceKm?: number | null; 
}

interface Order { 
  id: string; 
  totalAmount: number; 
  status: string; 
  createdAt: string | Date; 
  items: OrderItem[]; 
  city?: string | null; 
  deliveryDesc?: string | null; 
  customerName: string; 
  customerPhone: string; 
  delivery?: Delivery | null; 
}

// Mappings d'états
const STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'En attente', icon: Clock },
  CONFIRMED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Confirmée', icon: CheckCircle2 },
  PAID: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Payée', icon: CheckCircle2 },
  SHIPPED: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'Expédiée', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livrée', icon: CheckCircle2 },
  CANCELLED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Annulée', icon: XCircle },
};

const DELIVERY_STATUS_MAP: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  PENDING: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'Attente livreur', icon: Clock },
  ASSIGNED: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Livreur assigné', icon: User },
  IN_TRANSIT: { color: '#0891B2', bg: 'rgba(8,145,178,0.08)', label: 'En route', icon: Truck },
  DELIVERED: { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Livré', icon: CheckCircle2 },
  FAILED: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', label: 'Échouée', icon: XCircle },
};

// --- Sous-Composants ---

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
  const copy = () => { 
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(code); 
      setCopied(true); 
      setTimeout(() => setCopied(false), 2000); 
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, background: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)', color: '#fff' }}>
      <ShieldCheck size={14} style={{ opacity: 0.8 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.body, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.8 }}>Code de validation livraison</div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>{code}</span>
      </div>
      <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff', fontSize: 10, fontWeight: 600 }}>
        {copied ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
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
  if (status === 'FAILED') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', color: C.red }}>
      <XCircle size={14} /> <span style={{ fontSize: 11, fontWeight: 700 }}>Problème de livraison</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0' }}>
      {steps.map((step, i) => {
        const reached = i <= currentIdx;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <div style={{ flex: 1, height: 2, background: reached ? C.emerald : C.border, transition: 'all 0.4s' }} />}
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: reached ? C.emerald : C.border, transition: 'all 0.4s' }} />
          </React.Fragment>
        );
      })}
    </div>
  );
};

const OrderItemRow = ({ item }: { item: OrderItem }) => {
  const imgUrl = item.product?.images?.[0];
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imgUrl ? (
           <img src={imgUrl} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
           <Package size={18} color={C.muted} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.85rem', color: C.forest }}>{item.product?.name}</div>
        <div style={{ fontFamily: F.body, fontSize: '0.75rem', color: C.muted }}>
          {item.quantity} {item.product?.unit || ''} &bull; {item.priceAtSale.toLocaleString()} CFA
        </div>
      </div>
    </li>
  );
};

// --- Composant Principal de Carte ---

function OrderCard({ order }: { order: Order }) {
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