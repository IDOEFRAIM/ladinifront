import type React from 'react';
import { C } from '@/features/monitoring/cockpit/ui/primitives';

export const BASE = '/api/admin/availability-campaigns';

export const button = (primary = false): React.CSSProperties => ({
  border: primary ? 'none' : `1px solid ${C.border}`,
  background: primary ? C.forest : '#fff',
  color: primary ? '#fff' : C.text,
  borderRadius: 100,
  padding: '7px 16px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
});
