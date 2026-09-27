'use client';

import { Truck, Phone, UserCheck } from 'lucide-react';
import { C, F } from '@/features/orders/components/tracking/tracking-ui';

import type { TrackingDelivery } from '@/features/buyer/types/tracking.types';

interface Props {
  delivery: NonNullable<TrackingDelivery>;
  agent: NonNullable<NonNullable<TrackingDelivery>['agent']>;
}

export default function RiderCard({ delivery, agent }: Props) {
  return (
  <div style={{ background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: C.sand, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <UserCheck size={28} color={C.forest} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Votre Livreur</div>
      <div style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.forest }}>{agent.user?.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
         <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
           <Truck size={14} /> {agent.vehicleType || 'Coursier'}
         </span>
         {delivery.estimatedDistanceKm && (
           <span style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>• {delivery.estimatedDistanceKm} km restants</span>
         )}
      </div>
    </div>
    {agent.user?.phone && (
      <a href={`tel:${agent.user.phone}`} style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald, transition: 'transform 0.2s' }}>
        <Phone size={20} fill="currentColor" />
      </a>
    )}
  </div>
  );
}
