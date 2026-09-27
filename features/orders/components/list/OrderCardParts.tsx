'use client';

import React, { useState } from 'react';
import { Package, XCircle, ShieldCheck, Copy, Check } from 'lucide-react';
import { C, F } from '@/features/orders/components/list/orders-list.tokens';
import { OrderItem } from '@/features/orders/components/list/orders-list.types';

export function Badge({ config }: { config: { color: string; bg: string; label: string; icon: any } }) {
  const Icon = config.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 100, background: config.bg, color: config.color, fontSize: 11, fontWeight: 700, fontFamily: F.body }}>
      <Icon size={11} /> {config.label}
    </span>
  );
}

export function OTPDisplay({ code }: { code: string }) {
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

export const DeliveryMiniStepper = ({ status }: { status: string }) => {
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

export const OrderItemRow = ({ item }: { item: OrderItem }) => {
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
