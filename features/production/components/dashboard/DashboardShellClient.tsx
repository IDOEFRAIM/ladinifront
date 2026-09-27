'use client';

import { useMemo, useState } from 'react';
import DashboardHeader from '@/features/production/components/dashboard/DashboardHeader';
import AssetInventory from '@/features/inventory/components/AssetInventory';
import OperationalTriggers from '@/features/production/components/dashboard/OperationTrigger';
import MarketArbitrage from '@/features/production/components/dashboard/MarketArbitrage';
import PendingSeedDistributions from '@/features/inventory/components/PendingSeedDistributions';
import { useInventory } from '@/features/inventory/hooks/useInventory';
import type { AgrobusinessAsset } from '@/types/dashboard.index';
import { HeartPulse, Layers, AlertTriangle, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { THEME_COLORS as C } from '@/lib/theme';
import { KpiCard, StockValueCard, OrganizationCard } from '@/features/production/components/dashboard/cards/DashboardCards';

type DashboardShellProps = {
  assets: AgrobusinessAsset[];
  organizations: unknown[];
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

  const alertsOk = alertsCount === 0;

  return (
    <>
      <OrgSelector />
      <div style={{ minHeight: '100vh', background: C.sand }} className="p-4 md:p-8 lg:p-12">
        <DashboardHeader activeUnit={activeUnit} onUnitChange={setActiveUnit} units={unitsFromAssets} />

        {/* BANDEAU KPI — 4 cartes de même poids visuel, même traitement que la page d'accueil */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginTop: 28 }}>
          <KpiCard
            icon={HeartPulse}
            accent={C.emerald}
            accentBg="rgba(16,185,129,0.1)"
            label="Index de vitalité"
            value={`${healthScore}%`}
            hint={healthScore > 80 ? 'Exploitation performante' : 'Optimisations recommandées'}
          />
          <KpiCard
            icon={Layers}
            accent={C.statBlue}
            accentBg="rgba(59,130,246,0.1)"
            label="Lots suivis"
            value={filteredItems.length.toString()}
            hint="Unités inventoriées"
          />
          <KpiCard
            icon={AlertTriangle}
            accent={alertsOk ? C.emerald : C.statRose}
            accentBg={alertsOk ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}
            label="Alertes"
            value={alertsCount.toString()}
            hint="Lots à risque"
          />
          <KpiCard
            icon={Package}
            accent={C.statAmber}
            accentBg="rgba(245,158,11,0.1)"
            label="Volumes"
            value={totalQuantity.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            hint="Quantité totale"
          />
        </div>

        {/* CONTENU PRINCIPAL — stock (large) + résumé financier/organisation (étroit) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-7" style={{ marginTop: 28 }}>
          <div className="xl:col-span-2">
            <AssetInventory assets={filteredItems} />
          </div>
          <div className="xl:col-span-1 flex flex-col gap-7">
            <StockValueCard totalValue={totalValue} />
            <OrganizationCard organization={activeOrganization} perishableCount={perishableCount} />
          </div>
        </div>

        {/* PANNEAUX SECONDAIRES — pleine largeur, chacun a enfin la place de respirer
            (au lieu d'être empilés dans une colonne étroite qui forçait tout à déborder) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginTop: 28 }}>
          <PendingSeedDistributions />
          <OperationalTriggers assets={filteredItems} />
          <MarketArbitrage assets={filteredItems} />
        </div>
      </div>
    </>
  );
}
