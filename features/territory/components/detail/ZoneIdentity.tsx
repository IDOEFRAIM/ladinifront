'use client';

import { FaMapMarkerAlt } from 'react-icons/fa';
import { C } from '@/features/territory/components/detail/territory-detail.tokens';

export function ZoneIdentity({ zone, isEditing, form, setForm }: any) {
  return (
    <div style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 40, padding: 40, position: 'relative', overflow: 'hidden', marginBottom: 32, boxShadow: '0 12px 40px rgba(16,150,90,0.06)' }}>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }} className="md:flex-row md:flex md:items-center md:gap-8">
        <div style={{ width: 128, height: 128, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontWeight: 900, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, boxShadow: '0 18px 40px rgba(16,150,90,0.08)' }}>
          {zone.code}
        </div>
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ padding: '8px 14px', borderRadius: 999, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', background: zone.isActive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: zone.isActive ? 'rgba(22,163,74,0.9)' : 'rgba(220,38,38,0.9)' }}>{zone.isActive ? 'Opérationnelle' : 'Inactive'}</span>
            <span style={{ color: C.muted, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaMapMarkerAlt style={{ color: C.forest }} /> {zone.climaticRegion?.name}
            </span>
          </div>
          {isEditing ? (
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', fontSize: 36, fontWeight: 900, color: C.stone900, borderBottom: '4px solid rgba(0,0,0,0.04)', outline: 'none', background: 'transparent', fontStyle: 'italic' }} />
          ) : (
            <h1 style={{ fontSize: 56, fontWeight: 900, color: C.stone900, letterSpacing: '-0.02em', fontStyle: 'italic', textTransform: 'uppercase' }}>{zone.name}</h1>
          )}
        </div>
      </div>
    </div>
  );
}
