'use client';

import { Wallet } from 'lucide-react';
import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { C, GlassCard } from '@/features/checkout/components/checkout/checkout-ui';
import type { CheckoutFormData } from '@/features/checkout/components/checkout/checkout.types';

interface Props {
  register: UseFormRegister<CheckoutFormData>;
  watch: UseFormWatch<CheckoutFormData>;
  isProcessing: boolean;
}

export default function PaymentMethodCard({ register, watch, isProcessing }: Props) {
  return (
  <GlassCard style={{ padding: 28 }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
      <Wallet size={16} /> Mode de Paiement
    </h2>
    <div style={{ display: 'grid', gap: 12 }}>
      {[
          { id: 'mobile_money', label: 'Mobile Money', desc: 'Orange Money ou Moov Money' }, 
          { id: 'cash', label: 'Espèces', desc: 'Payer à la livraison' }
      ].map(opt => {
        const active = watch('paymentMethod') === opt.id;
        return (
          <label key={opt.id} style={{ 
              display: 'flex', alignItems: 'center', gap: 15, padding: 16, borderRadius: 16, 
              border: active ? `2px solid ${C.emerald}` : `1px solid ${C.border}`, 
              background: active ? `${C.emerald}08` : 'transparent', 
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
          }}>
            <input type="radio" value={opt.id} {...register('paymentMethod')} disabled={isProcessing} style={{ accentColor: C.emerald, width: 18, height: 18 }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: active ? C.forest : C.text }}>{opt.label}</span>
              <br/>
              <span style={{ fontSize: '0.7rem', color: C.muted }}>{opt.desc}</span>
            </div>
          </label>
        );
      })}
    </div>
  </GlassCard>
  );
}
