import type React from 'react';
import { C, type OnboardingState } from '@/features/auth/components/onboarding/onboarding.config';

/** Setter typé d'un champ du formulaire d'onboarding. */
export type SetField = <K extends keyof OnboardingState>(key: K, val: OnboardingState[K]) => void;

export const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.6)',
    fontFamily: "'Inter', sans-serif", fontSize: 15, color: C.forest,
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
  };
