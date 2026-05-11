import React from 'react';

// ─── Design tokens (shared across all productor pages) ──────────────────────
export const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  lime: '#84CC16',
  amber: '#D97706',
  sand: '#F9FBF8',
  glass: 'rgba(255,255,255,0.72)',
  border: 'rgba(6,78,59,0.07)',
  muted: '#64748B',
  text: '#1F2937',
} as const;

export const F = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
} as const;

// ─── GlassCard ──────────────────────────────────────────────────────────────
export function GlassCard({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: C.glass,
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: `1px solid ${C.border}`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── RestrictedScreen (used by server pages needing auth) ───────────────────
export function RestrictedScreen({ message = 'Veuillez vous connecter en tant que producteur.' }: { message?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: '40px 32px', textAlign: 'center' as const }}>
        <h2 style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>Accès restreint</h2>
        <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.muted, marginTop: 8 }}>{message}</p>
      </div>
    </div>
  );
}
