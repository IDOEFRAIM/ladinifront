'use client';

import { MapPin } from 'lucide-react';
import LastMileGuide from '@/components/geo/LastMileGuide';
import { C, GlassCard } from '@/features/checkout/components/checkout/checkout-ui';
import type { GeoUpdateData } from '@/features/checkout/components/checkout/checkout.types';

interface Props {
  onChange: (data: GeoUpdateData | null) => void;
}

export default function DeliveryPointCard({ onChange }: Props) {
  return (
  <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>
      <MapPin size={16} /> Point de livraison
    </div>
    <LastMileGuide onChange={onChange} />
  </GlassCard>
  );
}
