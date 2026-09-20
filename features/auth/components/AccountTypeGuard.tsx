'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type BuyerAccountType = 'PARTICULIER' | 'RESTAURANT' | 'HOTEL' | 'CANTINE' | 'GROSSISTE' | 'OTHER';

export interface BuyerProfile {
  id: string;
  buyerType: { id: string; name: string } | null;
  establishmentName: string | null;
  defaultDeliveryAddress: string | null;
  trustBadge: boolean | null;
  verifiedAt: string | null;
}

interface AccountTypeContextValue {
  profile: BuyerProfile | null;
  accountType: BuyerAccountType;
  isB2B: boolean;
  isB2C: boolean;
  loading: boolean;
}

const AccountTypeContext = createContext<AccountTypeContextValue>({
  profile: null,
  accountType: 'PARTICULIER',
  isB2B: false,
  isB2C: true,
  loading: true,
});

export const useAccountType = () => useContext(AccountTypeContext);

// ─── Classify buyer type name → account type ───────────────────────────────
function classifyBuyerType(typeName: string | null | undefined): BuyerAccountType {
  if (!typeName) return 'PARTICULIER';
  const n = typeName.toUpperCase().trim();
  if (n.includes('RESTAURANT')) return 'RESTAURANT';
  if (n.includes('HOTEL') || n.includes('HÔTEL')) return 'HOTEL';
  if (n.includes('CANTINE')) return 'CANTINE';
  if (n.includes('GROSSISTE')) return 'GROSSISTE';
  if (n.includes('PARTICULIER')) return 'PARTICULIER';
  return 'OTHER';
}

const B2B_TYPES: BuyerAccountType[] = ['RESTAURANT', 'HOTEL', 'CANTINE', 'GROSSISTE'];

// ─── Provider ───────────────────────────────────────────────────────────────
export function AccountTypeGuard({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<BuyerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/buyer/dashboard?section=profile');
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile ?? null);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const accountType = classifyBuyerType(profile?.buyerType?.name);
  const isB2B = B2B_TYPES.includes(accountType);
  const isB2C = !isB2B;

  return (
    <AccountTypeContext.Provider value={{ profile, accountType, isB2B, isB2C, loading }}>
      {children}
    </AccountTypeContext.Provider>
  );
}

// ─── Conditional renderers ──────────────────────────────────────────────────
export function B2BOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isB2B, loading } = useAccountType();
  if (loading) return null;
  return isB2B ? <>{children}</> : <>{fallback ?? null}</>;
}

export function B2COnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isB2C, loading } = useAccountType();
  if (loading) return null;
  return isB2C ? <>{children}</> : <>{fallback ?? null}</>;
}

// ─── Account type banner (to show in buyer layout) ──────────────────────────
const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', muted: '#64748B', border: 'rgba(6,78,59,0.07)' };

export function AccountTypeBanner() {
  const { profile, accountType, isB2B, loading } = useAccountType();

  if (loading || !profile) return null;

  const labels: Record<BuyerAccountType, string> = {
    PARTICULIER: '🛒 Espace Particulier',
    RESTAURANT: '🍽️ Espace Restaurant',
    HOTEL: '🏨 Espace Hôtel',
    CANTINE: '🍱 Espace Cantine',
    GROSSISTE: '📦 Espace Grossiste',
    OTHER: '🏢 Espace Professionnel',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
      background: isB2B ? 'rgba(217,119,6,0.06)' : 'rgba(16,185,129,0.04)',
      borderBottom: `1px solid ${C.border}`,
      fontFamily: "'Inter', sans-serif", fontSize: 12,
    }}>
      <span style={{ fontWeight: 700, color: isB2B ? C.amber : C.forest }}>
        {labels[accountType]}
      </span>
      {profile.establishmentName && (
        <span style={{ color: C.muted, fontWeight: 600 }}>
          · {profile.establishmentName}
        </span>
      )}
      {profile.trustBadge && (
        <span style={{ color: C.emerald, fontWeight: 700, marginLeft: 'auto', fontSize: 11 }}>
          ✓ Vérifié
        </span>
      )}
    </div>
  );
}
