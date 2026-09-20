'use client';

import React from 'react';
import { C } from '@/features/auth/components/onboarding/onboarding.config';

// ── Stepper Component ──────────────────────────────────────────────────
export function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i <= current ? C.emerald : 'rgba(6,78,59,0.08)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

// ── Summary Row ──────────────────────────────────────────────────────────
export function SummaryRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14,
      background: 'rgba(16,185,129,0.04)', border: `1px solid ${C.border}`,
    }}>
      {icon && <div style={{ color: C.emerald, flexShrink: 0 }}>{icon}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.forest, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}
