'use client';

import { C } from '@/features/territory/components/overview/territories.tokens';

export function GlassCard({ children, style }: any) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}
