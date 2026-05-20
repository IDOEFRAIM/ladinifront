import React from 'react';
import Link from 'next/link';
import { fetchDashboardInventoryServer } from '@/app/actions/dashboard.server';
import { Leaf, Plus, Loader2 } from 'lucide-react';
import { SessionPayload } from '@/lib/session'; // Assurez-vous que le chemin est correct

// Extension du type Session pour inclure nos champs spécifiques
interface ExtendedSessionPayload extends SessionPayload {
  organizations?: any[];
  activeOrg?: any;
}

export const dynamic = 'force-dynamic';

function LoadingView() {
  return (
    <div className="min-h-screen bg-[#F9FBF8] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 size={40} className="text-[#10B981] animate-spin mb-4" />
        <p className="font-sans text-[#64748B] font-bold text-[0.8rem] uppercase tracking-widest text-center px-4">
          DASHBOARD : Analyse de votre exploitation...
        </p>
      </div>
    </div>
  );
}

function EmptyView({ activeOrg }: { activeOrg?: any }) {
  const orgName = activeOrg?.name || activeOrg?.organizationId || activeOrg?.id;

  return (
    <div className="min-h-screen bg-[#F9FBF8] p-6 flex items-center justify-center">
      <div className="bg-white/72 backdrop-blur-md p-12 rounded-[32px] border border-[rgba(6,78,59,0.07)] max-w-[720px] w-full text-center shadow-[0_20px_60px_rgba(6,78,59,0.06)]">
        <div className="w-20 h-20 rounded-full bg-[#10B981]/[0.08] flex items-center justify-center mx-auto mb-7">
          <Leaf size={36} className="text-[#10B981]" />
        </div>
        
        <h1 className="font-sans text-3xl font-extrabold text-[#064E3B] mb-3">
          Bienvenue, Producteur !
        </h1>
        <p className="font-sans text-[#64748B] mb-3 leading-relaxed">
          Votre tableau de bord est prêt.
        </p>
        
        {activeOrg ? (
          <div className="mb-5">
            <p className="font-sans text-xs text-[#64748B] mb-1.5 font-semibold uppercase tracking-wider">
              Organisation active :
            </p>
            <h3 className="font-sans text-lg font-bold text-[#064E3B] mb-4">
              {orgName || "Organisation"}
            </h3>
            <div className="flex gap-2.5 justify-center mb-4">
              <Link href="/org/dashboard" className="px-4 py-2.5 rounded-xl border border-[rgba(6,78,59,0.08)] bg-white text-sm font-bold text-[#064E3B] no-underline hover:bg-gray-50">
                Voir l'organisation
              </Link>
            </div>
            <p className="font-sans text-sm text-[#64748B] max-w-md mx-auto mb-6">
              Si vous n'avez pas encore de produits, commencez par en déclarer.
            </p>
          </div>
        ) : (
          <p className="font-sans text-[#64748B] mb-8 leading-relaxed max-w-md mx-auto">
            Commencez par déclarer vos premiers produits pour activer le suivi intelligent.
          </p>
        )}
        
        <Link href="/products/add" className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#064E3B] to-[#10B981] text-white px-8 py-4 rounded-full font-sans font-extrabold text-sm no-underline shadow-md hover:opacity-95">
          <Plus size={20} /> Ajouter un produit
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  let userId: string | undefined = undefined;
  let organizations: any[] = [];
  let activeOrg: any = null;

  try {
    const sessionMod = await import('@/lib/session');
    const session = await sessionMod.getSessionFromRequest(null as any).catch(() => null);
    
    // Application de notre extension de type
    const typedSession = session as ExtendedSessionPayload | null;
    
    userId = typedSession?.userId;
    organizations = typedSession?.organizations || [];
    activeOrg = typedSession?.activeOrg || null;
  } catch (e) {
    console.error("Erreur session:", e);
  }

  // Si pas de session, message d'erreur clair
  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-[#DC2626] font-bold mb-2">Session expirée.</p>
        <Link href="/login" className="text-[#064E3B] underline font-bold">Retour à la connexion</Link>
      </div>
    );
  }

  // Récupération des données métiers
  const assets = await fetchDashboardInventoryServer(userId).catch(() => []);

  // Si aucun actif, vue vide
  if (assets.length === 0) {
    return <EmptyView activeOrg={activeOrg} />;
  }

  // Import dynamique du composant client
  const DashboardShell = (await import('@/components/productorDashboard/DashboardShellClient')).default;
  
  return (
    <DashboardShell 
      assets={assets} 
      organizations={organizations} 
      activeOrg={activeOrg} 
    />
  );
}