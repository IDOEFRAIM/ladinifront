"use client";

import React, { useMemo, useState } from 'react';
import DashboardHeader from '@/components/productorDashboard/dashboardHeader';
import AssetInventory from '@/components/productorDashboard/AssetInventory';
import OperationalTriggers from '@/components/productorDashboard/operationTrigger';
import MarketArbitrage from '@/components/productorDashboard/marketArbitrage';
import PendingSeedDistributions from '@/components/productorDashboard/PendingSeedDistributions';
import { useInventory } from '@/hooks/useInventory';
import type { AgrobusinessAsset } from '@/types/dashboard.index';
import { HeartPulse } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DashboardShellProps = {
  assets: AgrobusinessAsset[];
  organizations: any[];
  activeOrg: any;
  serverSelectOrg?: (orgId: string) => Promise<{ success: boolean }>;
};

export default function DashboardShellClient({ assets, organizations, activeOrg, serverSelectOrg }: DashboardShellProps) {
  const router = useRouter();
  const [activeUnit, setActiveUnit] = useState('global');
  const inventory = useInventory(assets || [], activeUnit, 39);
  const { totalValue, healthScore, filteredItems } = inventory;

  const alertsCount = useMemo(
    () => filteredItems.filter((item) => item.riskLevel !== 'STABLE').length,
    [filteredItems],
  );
  const perishableCount = useMemo(
    () => filteredItems.filter((item) => item.isPerishable).length,
    [filteredItems],
  );
  const totalQuantity = useMemo(
    () => filteredItems.reduce((acc, item) => acc + item.quantity, 0),
    [filteredItems],
  );
  const activeOrganization = activeOrg || organizations?.[0] || null;

  const unitsFromAssets = useMemo(() => {
    const labels = new Map<string, string>();
    (assets || []).forEach((asset) => {
      labels.set(asset.unitId, asset.name.split(' ')[0] || asset.unitId);
    });
    return Array.from(labels.entries()).map(([id, label]) => ({ id, label }));
  }, [assets]);

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
        <DashboardHeader activeUnit={activeUnit} onUnitChange={setActiveUnit} units={unitsFromAssets} />
        <div className="grid grid-cols-1 xl:grid-cols-4" style={{ gap: 28, marginTop: 28 }}>
          <div className="xl:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 28px', background: 'rgba(16,185,129,0.06)', borderRadius: 24, border: `1px solid rgba(16,185,129,0.12)` }} className="flex-col sm:flex-row">
                <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(6,78,59,0.07)`, flexShrink: 0 }}>
                  <HeartPulse size={24} color="#10B981" />
                  <span style={{ position: 'absolute', top: -4, right: -4, background: '#064E3B', color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100 }}> {healthScore}%</span>
                </div>
                <div className="text-center sm:text-left">
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Index de Vitalité</p>
                  <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{healthScore > 80 ? 'Exploitation performante' : 'Optimisations recommandées'}</p>
                </div>
              </div>
              <StatBadge label="Lots suivis" value={filteredItems.length.toString()} hint="Unités inventoriées" />
              <StatBadge label="Alertes" value={alertsCount.toString()} hint="Lots à risque" variant="warning" />
              <StatBadge label="Volumes" value={`${totalQuantity.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`} hint="Quantité totale" />
            </div>
            <AssetInventory assets={filteredItems} />
          </div>
          <div className="xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <OrganizationCard organization={activeOrganization} perishableCount={perishableCount} />
            <div style={{ background: '#064E3B', borderRadius: 28, padding: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Valeur Estimee du Stock</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>{totalValue.toLocaleString('fr-FR')} <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>FCFA</span></h3>
                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8 }}>Prix du marche en direct</span>
              </div>
            </div>
            <PendingSeedDistributions />
            <OperationalTriggers assets={filteredItems} />
            <MarketArbitrage assets={filteredItems} />
          </div>
        </div>
      </div>
    </>
  );
}

function StatBadge({ label, value, hint, variant = 'default' }: { label: string; value: string; hint: string; variant?: 'default' | 'warning' }) {
  const palette = variant === 'warning'
    ? { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.4)', text: '#B91C1C' }
    : { bg: 'rgba(6,78,59,0.05)', border: 'rgba(6,78,59,0.15)', text: '#064E3B' };
  return (
    <div style={{ padding: '18px 20px', borderRadius: 24, border: `1px solid ${palette.border}`, background: palette.bg }}>
      <p style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: '1.6rem', fontWeight: 900, color: palette.text }}>{value}</p>
      <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{hint}</p>
    </div>
  );
}

function OrganizationCard({ organization, perishableCount }: { organization: any; perishableCount: number }) {
  if (!organization) {
    return (
      <div style={{ borderRadius: 24, border: '1px dashed rgba(6,78,59,0.2)', padding: 20 }}>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>Aucune organisation active</p>
        <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Associez-vous à une coopérative pour débloquer le suivi collectif.</p>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 28, border: '1px solid rgba(6,78,59,0.12)', padding: 24, background: 'white' }}>
      <p style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Organisation active</p>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#064E3B', marginTop: 6 }}>{organization.name || organization.organizationId || 'Organisation'}</h3>
      <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>{organization.role ? `Rôle : ${organization.role}` : 'Producteur membre'}</p>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569' }}>
        <span>{filteredLabel(perishableCount)} périssables</span>
        <span>{new Date().toLocaleDateString('fr-FR')}</span>
      </div>
    </div>
  );
}

function filteredLabel(count: number) {
  if (count === 0) return '0 lot urgent';
  if (count === 1) return '1 lot urgent';
  return `${count} lots urgents`;
}
