import type { CSSProperties, ReactNode } from 'react';
import { C } from './tokens';

// Composant serveur : le survol est en CSS (.glass-card--hover), plus de JS pour un hover.
export default function GlassCard({
  children, style, hover = true,
}: { children: ReactNode; style?: CSSProperties; hover?: boolean }) {
  return (
    <div
      className={`glass-card${hover ? ' glass-card--hover' : ''}`}
      style={{
        background: C.glass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${C.border}`,
        padding: 28,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
