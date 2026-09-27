'use client';

import { User } from 'lucide-react';
import type { UseFormRegister } from 'react-hook-form';
import { C, GlassCard, getInputStyle } from '@/features/checkout/components/checkout/checkout-ui';
import type { CheckoutFormData } from '@/features/checkout/components/checkout/checkout.types';

interface Props {
  register: UseFormRegister<CheckoutFormData>;
  isProcessing: boolean;
}

export default function CustomerInfoCard({ register, isProcessing }: Props) {
  const inputStyle = getInputStyle(isProcessing);
  return (
  <GlassCard style={{ padding: 28 }}>
    <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
      <User size={16} /> Informations Client
    </h2>
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: 6 }}>Nom & Prénom</label>
        <input {...register('name', { required: true })} disabled={isProcessing} placeholder="Ex: Jean Traoré" style={inputStyle} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: 6 }}>Numéro Mobile (WhatsApp)</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: C.forest, fontSize: '0.9rem' }}>+226</span>
          <input type="tel" {...register('phone', { required: true, pattern: /^[0-9]{8}$/ })} disabled={isProcessing} placeholder="70000000" style={{ ...inputStyle, paddingLeft: 60, fontWeight: 800 }} />
        </div>
      </div>
    </div>
  </GlassCard>
  );
}
