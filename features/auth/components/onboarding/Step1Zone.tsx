'use client';

import { MapPin, Check, Search } from 'lucide-react';
import { C, type OnboardingState, type ZoneOption } from '@/features/auth/components/onboarding/onboarding.config';
import { inputStyle, type SetField } from '@/features/auth/components/onboarding/onboarding-shared';

interface Props {
  state: OnboardingState;
  set: SetField;
  zones: ZoneOption[];
  zoneSearch: string;
  onZoneSearchChange: (value: string) => void;
}

export default function Step1Zone({ state, set, zones, zoneSearch, onZoneSearchChange }: Props) {
  const filtered = zones.filter((z) => {
    if (!zoneSearch) return true;
    const q = zoneSearch.toLowerCase();
    return z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q);
  });
  return (
    <div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Votre zone d'activité</h2>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Sélectionnez la zone où vous opérez</p>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
        <input value={zoneSearch} onChange={(e) => onZoneSearchChange(e.target.value)}
          placeholder="Rechercher une zone..." style={{ ...inputStyle, paddingLeft: 42 }} />
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 20 }}>Aucune zone trouvée</p>
        ) : filtered.map((z) => {
          const active = state.zoneId === z.id;
          return (
            <button key={z.id} type="button" onClick={() => set('zoneId', z.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                border: `2px solid ${active ? C.emerald : C.border}`,
                background: active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s', textAlign: 'left', minHeight: 52,
              }}>
              <MapPin size={18} style={{ color: active ? C.emerald : C.muted, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: active ? C.forest : C.muted }}>{z.name}</span>
                <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{z.code}</span>
              </div>
              {active && <Check size={16} style={{ color: C.emerald, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
