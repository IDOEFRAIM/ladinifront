"use client";

import React, { useState, useEffect } from 'react';
import DashboardHeader from '@/components/productorDashboard/dashboardHeader';
import AssetInventory from '@/components/productorDashboard/AssetInventory';
import OperationalTriggers from '@/components/productorDashboard/operationTrigger';
import MarketArbitrage from '@/components/productorDashboard/marketArbitrage';
import { useInventory } from '@/hooks/useInventory';
import { Leaf, Plus, HeartPulse, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardShellClient({ assets, organizations, activeOrg, serverSelectOrg }: any) {
  const router = useRouter();
  const [activeUnit, setActiveUnit] = useState('global');
  const { totalValue, healthScore } = useInventory(assets || [], activeUnit, 39);

  const OrgSelector = () => {
    if (!organizations || organizations.length <= 1) return null;
    return (
      <div style={{ padding: 12, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <select defaultValue={activeOrg?.id} onChange={e => selectOrganization(e.target.value)} className="px-3 py-2 rounded-lg border">
          <option value="">Choisir une organisation...</option>
          {organizations.map((o: any) => (
            <option key={o.organizationId || o.id} value={o.organizationId || o.id}>{o.name || o.organizationId || o.id} {o.role ? `(${o.role})` : ''}</option>
          ))}
        </select>
      </div>
    );
  };

  async function selectOrganization(orgId: string) {
    try {
      if (typeof serverSelectOrg === 'function') {
        const r = await serverSelectOrg(orgId);
        if (r && r.success) {
          window.location.reload();
          return;
        }
      }

      const res = await fetch('/api/select-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
        credentials: 'same-origin',
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error('selectOrg error', e);
    }
  }

  return (
    <>
      <OrgSelector />
      <div style={{ minHeight: '100vh', background: '#F9FBF8', padding: '16px' }} className="md:p-8 lg:p-12">
        <DashboardHeader activeUnit={activeUnit} onUnitChange={setActiveUnit} />
        <div className="grid grid-cols-1 xl:grid-cols-4" style={{ gap: 28, marginTop: 28 }}>
          <div className="xl:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 28px', background: 'rgba(16,185,129,0.06)', borderRadius: 24, border: `1px solid rgba(16,185,129,0.12)` }} className="flex-col sm:flex-row">
              <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(6,78,59,0.07)`, flexShrink: 0 }}>
                <HeartPulse size={24} color="#10B981" />
                <span style={{ position: 'absolute', top: -4, right: -4, background: '#064E3B', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}> {healthScore}%</span>
              </div>
              <div className="text-center sm:text-left">
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Index de Vitalite</p>
                <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{healthScore > 80 ? 'Exploitation Performante' : 'Optimisations recommandees'}</p>
              </div>
            </div>
            <AssetInventory activeUnit={activeUnit} />
          </div>
          <div className="xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div style={{ background: '#064E3B', borderRadius: 28, padding: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Valeur Estimee du Stock</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>{totalValue.toLocaleString('fr-FR')} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>FCFA</span></h3>
                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8 }}>Prix du marche en direct</span>
              </div>
            </div>
            <OperationalTriggers activeUnit={activeUnit} />
            <MarketArbitrage activeUnit={activeUnit} />
          </div>
        </div>
      </div>
    </>
  );
}
