'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/productorDashboard/dashboardHeader';
import AssetInventory from '@/components/productorDashboard/AssetInventory';
import OperationalTriggers from '@/components/productorDashboard/operationTrigger';
import MarketArbitrage from '@/components/productorDashboard/marketArbitrage';
import { useInventory } from '@/hooks/useInventory';
import { AgrobusinessAsset } from '@/types/dashboard.index';
import { Leaf, Plus, HeartPulse, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

function LoadingView() {
  return (
    <div style={{ minHeight: '100vh', background: C.sand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Loader2 size={40} color={C.emerald} className="animate-spin" style={{ marginBottom: 16 }} />
        <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' as const, letterSpacing: 2 }}>DASHBOARD:Analyse de votre exploitation...</p>
      </div>
    </div>
  );
}

function EmptyView({ user, router, activeOrg }: { user: any; router: any; activeOrg?: any }) {
  console.log('EmptyView props', { user, activeOrg });
  return (
    <div style={{ minHeight: '100vh', background: C.sand, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: C.glass, backdropFilter: 'blur(20px)', padding: '48px 40px', borderRadius: 32, border: `1px solid ${C.border}`, maxWidth: 720, textAlign: 'center' as const, boxShadow: '0 20px 60px rgba(6,78,59,0.06)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <Leaf size={36} color={C.emerald} />
        </div>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Bienvenue, {user?.name || 'Producteur'} !</h1>
        <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Votre tableau de bord est prêt.</p>
        {activeOrg ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 6 }}>Organisation active :</p>
            <h3 style={{ fontFamily: F.heading, color: C.forest, marginBottom: 8 }}>{activeOrg?.name || activeOrg?.organizationId || activeOrg?.id || activeOrg}</h3>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <button onClick={() => router.push('/org/dashboard')} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(6,78,59,0.08)', background: 'white', fontWeight: 700 }}>Voir l'organisation</button>
              <button onClick={() => router.push('/org/members')} style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(6,78,59,0.08)', background: 'white' }}>Membres</button>
            </div>
            <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 18 }}>Si vous n'avez pas encore de produits liés à cette organisation, commencez par en déclarer.</p>
          </div>
        ) : (
          <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>Commencez par déclarer vos premiers produits pour activer le suivi intelligent.</p>
        )}
        <button onClick={() => router.push('/products/add')} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: '16px 32px', borderRadius: 100, border: 'none', fontFamily: F.body, fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}>
          <Plus size={20} /> Ajouter un produit
        </button>
      </motion.div>
    </div>
  );
}

function DashboardView({ activeUnit, setActiveUnit, healthScore, totalValue }: { activeUnit: string; setActiveUnit: React.Dispatch<React.SetStateAction<string>>; healthScore: number; totalValue: number }) {
  return (
    <div style={{ minHeight: '100vh', background: C.sand, padding: '16px' }} className="md:p-8 lg:p-12">
      <DashboardHeader activeUnit={activeUnit} onUnitChange={setActiveUnit} />

      <div className="grid grid-cols-1 xl:grid-cols-4" style={{ gap: 28, marginTop: 28 }}>
        <div className="xl:col-span-3" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Health card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 28px', background: 'rgba(16,185,129,0.06)', borderRadius: 24, border: `1px solid rgba(16,185,129,0.12)` }} className="flex-col sm:flex-row">
            <div style={{ position: 'relative', width: 56, height: 56, borderRadius: '50%', background: C.glass, backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${C.border}`, flexShrink: 0 }}>
              <HeartPulse size={24} color={C.emerald} />
              <span style={{ position: 'absolute', top: -4, right: -4, background: C.forest, color: 'white', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 100, fontFamily: F.body }}>{healthScore}%</span>
            </div>
            <div className="text-center sm:text-left">
              <p style={{ fontFamily: F.body, fontSize: '0.75rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 2 }}>Index de Vitalite</p>
              <p style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.text }}>{healthScore > 80 ? "Exploitation Performante" : "Optimisations recommandees"}</p>
            </div>
          </motion.div>
          <AssetInventory activeUnit={activeUnit} />
        </div>

        <div className="xl:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Revenue card */}
          <div style={{ background: C.forest, borderRadius: 28, padding: 28, color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontFamily: F.body, fontSize: '0.65rem', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 14 }}>Valeur Estimee du Stock</p>
              <h3 style={{ fontFamily: F.heading, fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>{totalValue.toLocaleString('fr-FR')} <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 500 }}>FCFA</span></h3>
              <span style={{ fontFamily: F.body, fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8, color: 'rgba(255,255,255,0.7)' }}>Prix du marche en direct</span>
            </div>
            <Leaf size={120} style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.06, transform: 'rotate(12deg)' }} />
          </div>
          <OperationalTriggers activeUnit={activeUnit} />
          <MarketArbitrage activeUnit={activeUnit} />
        </div>
      </div>
    </div>
  );
}

  export default function DashboardPage() {
  const { user, isLoading: authLoading, organizations, activeOrg } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<AgrobusinessAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUnit, setActiveUnit] = useState('global');

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try { const res = await axios.get(`/api/dashboard/inventory`, { withCredentials: true }); if (Array.isArray(res.data)) setAssets(res.data); }
    catch (err) { console.error("Erreur chargement dashboard:", err); }
    finally { setIsLoading(false); }
  }, []);

  async function selectOrganization(orgId: string) {
    try {
      const res = await fetch('/api/select-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: orgId }),
        credentials: 'same-origin',
      });
      if (res.ok) {
        // reload to pick up new cookies/session context
        window.location.reload();
      } else {
        const txt = await res.text().catch(() => 'Erreur');

      }
    } catch (e) {
      console.error('selectOrg error', e);

    }
  }

  useEffect(() => { if (!authLoading) { if (user?.id) fetchAssets(); else setIsLoading(false); } }, [user, authLoading, fetchAssets]);

  const { totalValue, healthScore } = useInventory(assets, activeUnit, 39);

  if (authLoading || isLoading) return <LoadingView />;
  // If user has multiple organizations, show selector at top
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
  if (assets.length === 0) return <EmptyView user={user} router={router} activeOrg={activeOrg} />;
    console.log('Rendering DashboardView with', { activeUnit, healthScore, totalValue }); // For debugging; can be removed in production. 
  return (
    <>
      <OrgSelector />
      <DashboardView activeUnit={activeUnit} setActiveUnit={setActiveUnit} healthScore={healthScore} totalValue={totalValue} />
    </>
  );
}
