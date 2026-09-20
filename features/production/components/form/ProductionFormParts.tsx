'use client';

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { C, F } from '@/features/production/components/tokens';

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.border}`,
  background: 'white', fontFamily: F.body, fontSize: '0.85rem', color: C.text, outline: 'none',
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: F.body, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: C.muted, marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 12,
        border: `1px solid ${checked ? C.emerald : C.border}`, background: checked ? 'rgba(16,185,129,0.08)' : 'white',
        color: checked ? C.forest : C.muted, cursor: 'pointer', fontFamily: F.body, fontWeight: 700, fontSize: '0.78rem',
      }}
    >
      {checked ? <Eye size={15} /> : <EyeOff size={15} />} {label}
    </button>
  );
}

export function VisibilityButton({ icon, label }: { active: boolean; icon: React.ReactNode; label: string; readOnly?: boolean }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, background: 'rgba(6,78,59,0.05)', color: C.forest, fontFamily: F.body, fontWeight: 700, fontSize: '0.72rem' }}>
      {icon} {label}
    </span>
  );
}

export function chipStyle(positive: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: 'white',
    color: positive ? C.emerald : C.amber, cursor: 'pointer',
    fontFamily: F.body, fontWeight: 700, fontSize: '0.72rem',
  };
}
