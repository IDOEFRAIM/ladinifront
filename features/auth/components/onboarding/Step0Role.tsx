'use client';

import { Check } from 'lucide-react';
import { C, ROLES, type OnboardingState } from '@/features/auth/components/onboarding/onboarding.config';
import type { SetField } from '@/features/auth/components/onboarding/onboarding-shared';

interface Props {
  state: OnboardingState;
  set: SetField;
}

export default function Step0Role({ state, set }: Props) {
  return (
  <div>
    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 6 }}>Quel est votre rôle ?</h2>
    <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Choisissez le profil qui vous correspond</p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {ROLES.map((r) => {
        const active = state.role === r.value;
        return (
          <button key={r.value} type="button" onClick={() => set('role', r.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: 20, borderRadius: 20, cursor: 'pointer',
              border: `2px solid ${active ? r.color : C.border}`,
              background: active ? `${r.color}08` : 'rgba(255,255,255,0.5)',
              transition: 'all 0.25s', textAlign: 'left',
              minHeight: 80,
            }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: active ? `${r.color}15` : 'rgba(100,116,139,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.25s',
            }}>
              <r.icon size={24} style={{ color: active ? r.color : C.muted }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: active ? C.forest : C.muted }}>{r.label}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted, marginTop: 2 }}>{r.desc}</div>
            </div>
            {active && (
              <div style={{ width: 24, height: 24, borderRadius: 12, background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={14} style={{ color: '#fff' }} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  </div>
  );
}
