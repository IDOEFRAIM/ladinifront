'use client';

import React from 'react';
import { C, F } from '@/features/monitoring/cockpit/ui/primitives';

// ── Petits composants ──────────────────────────────────────────────────

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ margin: '0 0 8px', fontFamily: F.heading, fontSize: 14, color: C.forest }}>{title}</h3>
      {children}
    </section>
  );
}

export function KeyValues({ rows }: { rows: [string, string][] }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px 20px', margin: 0 }}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</dt>
          <dd style={{ margin: 0, fontSize: 13 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pill({ label, tone }: { label: string; tone: string }) {
  return <span style={{ color: tone, fontWeight: 700, fontSize: 12, border: `1px solid ${tone}`, borderRadius: 100, padding: '2px 10px', whiteSpace: 'nowrap' }}>{label}</span>;
}

export function TextField({ label, value, onChange, type = 'text', width = 150 }: { label: string; value: string; onChange: (v: string) => void; type?: string; width?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width, padding: '7px 9px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: F.body, fontSize: 13, textTransform: 'none', letterSpacing: 0 }}
      />
    </label>
  );
}

export const note: React.CSSProperties = { margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.5 };
export const linkBtn: React.CSSProperties = { border: 'none', background: 'transparent', color: C.forest, fontWeight: 700, cursor: 'pointer', fontSize: 12 };
export const pagerBtn = (disabled: boolean): React.CSSProperties => ({ border: `1px solid ${C.border}`, background: '#fff', borderRadius: 100, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, fontWeight: 600 });
