"use client";

import React, { useMemo, useState } from 'react';
import DashboardHeader from '@/components/productorDashboard/dashboardHeader';
import AssetInventory from '@/components/productorDashboard/AssetInventory';
import OperationalTriggers from '@/components/productorDashboard/operationTrigger';
import MarketArbitrage from '@/components/productorDashboard/marketArbitrage';
import PendingSeedDistributions from '@/components/productorDashboard/PendingSeedDistributions';
import { useInventory } from '@/hooks/useInventory';
import type { AgrobusinessAsset } from '@/types/dashboard.index';
import { HeartPulse, Layers, AlertTriangle, Package, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

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

function KpiCard({
  icon: Icon,
  accent,
  accentBg,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  accent: string;
  accentBg: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      style={{
        background: C.white,
        borderRadius: 24,
        border: `1px solid ${C.border}`,
        boxShadow: '0 10px 30px rgba(6,78,59,0.03)',
        padding: '20px 22px',
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <Icon size={18} color={accent} />
      </div>
      <p style={{ fontFamily: F.body, fontSize: '0.72rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </p>
      {/* Un nombre ne se fragmente jamais : nowrap + ellipsis en dernier recours plutôt
          qu'un break-word qui le couperait au milieu (le séparateur de milliers fr-FR
          est une espace insécable — voir StockValueCard pour le même principe). */}
      <p
        style={{
          fontFamily: F.heading,
          fontSize: '1.5rem',
          fontWeight: 800,
          color: C.forest,
          marginTop: 4,
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </p>
      <p style={{ fontFamily: F.body, fontSize: '0.72rem', color: C.muted, marginTop: 2, overflowWrap: 'break-word', lineHeight: 1.3 }}>
        {hint}
      </p>
    </div>
  );
}

// Notation compacte (ex: 240,6 Md au lieu de 240 570 000 000) — évite qu'une
// grosse valeur de stock ne déborde de sa carte à largeur fixe. La valeur
// exacte reste disponible via l'attribut `title` (survol) sur l'élément appelant.
function formatCompactFCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function StockValueCard({ totalValue }: { totalValue: number }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
        borderRadius: 28,
        padding: 28,
        color: C.white,
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <p style={{ fontFamily: F.body, fontSize: '0.7rem', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>
        Valeur estimée du stock
      </p>
      <h3
        title={`${totalValue.toLocaleString('fr-FR')} FCFA`}
        style={{ fontFamily: F.heading, fontSize: '2.1rem', fontWeight: 800, marginBottom: 10, lineHeight: 1.15, letterSpacing: '-0.02em' }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>{formatCompactFCFA(totalValue)}</span>{' '}
        <span style={{ fontFamily: F.body, fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>FCFA</span>
      </h3>
      <span style={{ fontFamily: F.body, fontSize: '0.72rem', fontWeight: 600, background: 'rgba(255,255,255,0.16)', padding: '5px 12px', borderRadius: 100 }}>
        Prix du marché en direct
      </span>
    </div>
  );
}

function OrganizationCard({ organization, perishableCount }: { organization: any; perishableCount: number }) {
  if (!organization) {
    return (
      <div style={{ borderRadius: 24, border: `1px dashed ${C.border}`, background: C.white, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Building2 size={16} color={C.muted} />
          <p style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 700, color: C.text }}>Aucune organisation active</p>
        </div>
        <p style={{ fontFamily: F.body, fontSize: '0.78rem', color: C.muted, lineHeight: 1.5 }}>
          Associez-vous à une coopérative pour débloquer le suivi collectif.
        </p>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 24, border: `1px solid ${C.border}`, padding: 22, background: C.white }}>
      <p style={{ fontFamily: F.body, fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
        Organisation active
      </p>
      <h3 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, marginTop: 6, overflowWrap: 'break-word' }}>
        {organization.name || organization.organizationId || 'Organisation'}
      </h3>
      <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.text, marginTop: 4 }}>
        {organization.role ? `Rôle : ${organization.role}` : 'Producteur membre'}
      </p>
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: C.muted, fontFamily: F.body }}>
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
