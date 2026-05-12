import React from 'react';
import Link from 'next/link';
import { fetchDashboardInventoryServer } from '@/app/actions/dashboard.server';
import { C, F } from '@/components/productor/tokens';
import { Leaf, Plus, Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

function EmptyView({ activeOrg }: { activeOrg?: any }) {
  return (
    <div style={{ minHeight: '100vh', background: C.sand, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', padding: '48px 40px', borderRadius: 32, border: `1px solid ${C.border}`, maxWidth: 720, textAlign: 'center' as const, boxShadow: '0 20px 60px rgba(6,78,59,0.06)' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <Leaf size={36} color={C.emerald} />
        </div>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Bienvenue, Producteur !</h1>
        <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>Votre tableau de bord est prêt.</p>
        {activeOrg ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 6 }}>Organisation active :</p>
            <h3 style={{ fontFamily: F.heading, color: C.forest, marginBottom: 8 }}>{activeOrg?.name || activeOrg?.organizationId || activeOrg?.id || activeOrg}</h3>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
              <Link href="/org/dashboard" style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(6,78,59,0.08)', background: 'white', fontWeight: 700, textDecoration: 'none', color: C.forest }}>Voir l&apos;organisation</Link>
              <Link href="/org/members" style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(6,78,59,0.08)', background: 'white', textDecoration: 'none', color: C.forest }}>Membres</Link>
            </div>
            <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 18 }}>Si vous n&apos;avez pas encore de produits liés à cette organisation, commencez par en déclarer.</p>
          </div>
        ) : (
          <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>Commencez par déclarer vos premiers produits pour activer le suivi intelligent.</p>
        )}
        <Link href="/products/add" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: '16px 32px', borderRadius: 100, fontFamily: F.body, fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none' }}>
          <Plus size={20} /> Ajouter un produit
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // Server-side: obtain session + assets in a single pass
  let userId: string | undefined = undefined;
  let organizations: any[] = [];
  let activeOrg: any = null;
  try {
    const sessionMod = await import('@/lib/session');
    const session = await sessionMod.getSessionFromRequest({} as any).catch(() => null);
    userId = session?.userId;
    organizations = (session as any)?.organizations || [];
    activeOrg = (session as any)?.activeOrg || null;
  } catch {}

  const assets = await fetchDashboardInventoryServer(userId);
  if (!userId) return <LoadingView />;
  if (assets.length === 0) return <EmptyView activeOrg={activeOrg} />;

  const DashboardShell = (await import('@/components/productorDashboard/DashboardShellClient')).default;
  return <DashboardShell assets={assets} organizations={organizations} activeOrg={activeOrg} />;
}
