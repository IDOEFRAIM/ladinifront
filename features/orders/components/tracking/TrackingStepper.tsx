'use client';

import { Clock, Package, AlertTriangle } from 'lucide-react';
import { C, F, STEP_ICONS, formatTime } from '@/features/orders/components/tracking/tracking-ui';

import type { TrackingTimelineStep } from '@/features/buyer/types/tracking.types';

interface Props {
  timeline: TrackingTimelineStep[] | undefined;
  isFailed: boolean;
}

export default function TrackingStepper({ timeline, isFailed }: Props) {
  return (
<div style={{ background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24 }}>
  <h3 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
    <Clock size={18} color={C.emerald} /> État d'avancement
  </h3>

  {isFailed ? (
    <div style={{ textAlign: 'center', padding: '20px 0', color: C.red }}>
      <AlertTriangle size={42} style={{ marginBottom: 12 }} />
      <p style={{ fontWeight: 800, fontSize: 16 }}>Livraison interrompue</p>
      <p style={{ fontSize: 13, opacity: 0.8 }}>Un agent va vous contacter pour résoudre le problème.</p>
    </div>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
      {timeline?.map((step: any, i: number) => {
        const Icon = STEP_ICONS[step.step] || Package;
        const isReached = step.reached;
        return (
          <div key={step.step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {/* Line connector */}
            {i < timeline.length - 1 && (
              <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 2, background: timeline[i+1].reached ? C.emerald : C.border, zIndex: -1 }} />
            )}
            {/* Circle */}
            <div style={{ 
              width: 36, height: 36, borderRadius: '50%', background: isReached ? C.emerald : '#fff', 
              border: `2px solid ${isReached ? C.emerald : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isReached ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none', transition: 'all 0.4s ease'
            }}>
              <Icon size={16} color={isReached ? '#fff' : C.muted} />
            </div>
            {/* Label */}
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: isReached ? C.forest : C.muted, lineHeight: 1.2 }}>{step.label}</div>
              {step.timestamp && (
                <div style={{ fontSize: 8, color: C.muted, marginTop: 2, fontWeight: 500 }}>{formatTime(step.timestamp).split(',')[1]}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
  );
}
