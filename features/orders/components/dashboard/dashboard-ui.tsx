import React from 'react';

export const C = { 
  forest: '#064E3B', 
  emerald: '#10B981', 
  amber: '#D97706', 
  red: '#DC2626', 
  sand: '#F9FBF8', 
  glass: 'rgba(255,255,255,0.85)', 
  border: 'rgba(6,78,59,0.08)', 
  muted: '#64748B', 
  text: '#1F2937' 
};

export const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

// --- Sous-composants utilitaires ---

export function Card({ children, style, hoverable = false }: { children: React.ReactNode; style?: React.CSSProperties; hoverable?: boolean }) {
  return (
    <div style={{ 
      background: C.glass, 
      backdropFilter: 'blur(16px)', 
      borderRadius: 16, 
      border: `1px solid ${C.border}`, 
      padding: 20,
      transition: 'all 0.2s ease',
      cursor: hoverable ? 'pointer' : 'default',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      ...style 
    }}>
      {children}
    </div>
  );
}

export function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.forest }}>
      <span style={{ color: C.muted }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ActionButton({ label, icon: Icon, onClick, variant = 'primary' }: any) {
  const isPrimary = variant === 'primary';
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
        border: isPrimary ? 'none' : `1px solid ${C.border}`,
        background: isPrimary ? C.forest : '#fff',
        color: isPrimary ? '#fff' : C.forest,
        fontFamily: F.body, fontSize: 12, fontWeight: 700, cursor: 'pointer'
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

export const formatXof = (value?: number) =>
  Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' XOF';
