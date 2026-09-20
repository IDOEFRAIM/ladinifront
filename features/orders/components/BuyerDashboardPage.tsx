'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw, ShoppingCart } from 'lucide-react';
import { asError } from '@/lib/errors';
import type { BuyerDashboardResponse } from '@/features/buyer/types/buyer-dashboard.types';
import { C, F, ActionButton } from '@/features/orders/components/dashboard/dashboard-ui';
import StatCards from '@/features/orders/components/dashboard/StatCards';
import ActiveOrdersSection from '@/features/orders/components/dashboard/ActiveOrdersSection';
import PreordersSection from '@/features/orders/components/dashboard/PreordersSection';
import AuctionsSection from '@/features/orders/components/dashboard/AuctionsSection';
import DashboardSidebar from '@/features/orders/components/dashboard/DashboardSidebar';

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<BuyerDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/buyer/dashboard');
      if (!res.ok) throw new Error('Erreur de connexion aux données');
      setData((await res.json()) as BuyerDashboardResponse);
      setError(null);
    } catch (_e: unknown) {
    const e = asError(_e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
      <Loader2 size={40} style={{ color: C.emerald, animation: 'spin 1.5s linear infinite' }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 500 }}>Préparation de votre espace...</p>
    </div>
  );

  const {
    profile = null,
    activeOrders = [],
    auctions = { active: [], won: [], lost: [] },
    billingSummary = null,
    preorders = [],
    suggestedProducts = [],
  } = data ?? {};

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px 80px' }}>
      
      {/* Header avec Actions Rapides */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '2rem', fontWeight: 900, color: C.forest, margin: 0 }}>
            Bonjour, {profile?.user?.name?.split(' ')[0] || 'Acheteur'} 👋
          </h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
            {profile?.establishmentName || 'Gérez vos approvisionnements et enchères.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <ActionButton label="Nouvelle commande" icon={ShoppingCart} onClick={() => router.push('/catalogue')} />
          <button onClick={fetchDashboard} style={{ padding: 10, borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={18} color={C.muted} />
          </button>
        </div>
      </header>

      <StatCards activeOrders={activeOrders} auctions={auctions} billingSummary={billingSummary} preorders={preorders} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, alignItems: 'start' }}>
        <section>
          <ActiveOrdersSection activeOrders={activeOrders} />
          <PreordersSection preorders={preorders} />
          <AuctionsSection auctions={auctions} />
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <DashboardSidebar billingSummary={billingSummary} suggestedProducts={suggestedProducts} />
        </aside>
      </div>
    </div>
  );
}
