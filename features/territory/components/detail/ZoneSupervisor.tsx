'use client';

import { FaUserTie } from 'react-icons/fa';
import { C } from '@/features/territory/components/detail/territory-detail.tokens';

export function ZoneSupervisor() {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.forest}, ${C.emerald})`, borderRadius: 28, padding: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.04)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08)' }}>
          <FaUserTie size={28} style={{ color: 'rgba(255,255,255,0.9)' }} />
        </div>
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>Superviseur de Zone</h4>
          <p style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic' }}>Agent Terrain Sénior</p>
        </div>
      </div>
      <button style={{ padding: '10px 18px', background: '#fff', color: C.forest, borderRadius: 12, fontWeight: 900, textTransform: 'uppercase', fontSize: 10 }}>Message</button>
    </div>
  );
}
