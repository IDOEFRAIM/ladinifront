import React from 'react';
import { C } from '@/features/monitoring/cockpit/ui/primitives';
import { STATUS_LABELS } from './format';

const COLORS: Record<string, string> = {
  NONE: C.muted,
  TO_FOLLOW_UP: C.amber,
  FOLLOWED_UP: C.blue,
  RESOLVED: C.emerald,
  NOT_INTERESTED: C.red,
};

export function StatusPill({ status }: { status: string }) {
  const color = COLORS[status] ?? C.muted;
  return (
    <span style={{ color, fontWeight: 700, fontSize: 12, border: `1px solid ${color}`, borderRadius: 100, padding: '2px 10px', whiteSpace: 'nowrap' }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
