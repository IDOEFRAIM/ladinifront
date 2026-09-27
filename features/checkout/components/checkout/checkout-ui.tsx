import React from 'react';

export const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.85)', 
  border:'rgba(6,78,59,0.08)', 
  muted:'#64748B', 
  text:'#1F2937', 
  error:'#EF4444' 
};

export const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

// Composants Atomiques
export const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ 
    background: C.glass, 
    backdropFilter: 'blur(12px)', 
    borderRadius: 24, 
    border: `1px solid ${C.border}`, 
    boxShadow: '0 4px 24px -2px rgba(0,0,0,0.02)',
    ...style 
  }}>{children}</div>
);

/** Style commun des champs du formulaire (curseur bloqué pendant le traitement). */
export const getInputStyle = (isProcessing: boolean): React.CSSProperties => ({
width: '100%', padding: '14px 16px', borderRadius: 14, 
border: `1px solid ${C.border}`, background: 'white', 
fontFamily: F.body, fontSize: '0.95rem', outline: 'none',
transition: 'border-color 0.2s',
cursor: isProcessing ? 'not-allowed' : 'text'
});
