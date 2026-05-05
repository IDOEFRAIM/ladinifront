import React from 'react';
import { db, schema } from '@/src/db';
import { eq, and, desc } from 'drizzle-orm';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link'; // Import pour la navigation
import { ArrowLeft } from 'lucide-react'; // Icône de retour
import CopyButton from './CopyButton';
import {
  DIST_STATUS_LABELS,
  DIST_STATUS_BADGE,
  type DistributionStatus,
} from '@/lib/distributionStateMachine';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page(props: PageProps) {
  const { id: distributionId } = await props.params;
  const hdr = await headers();

  const sessionMod = await import('@/lib/session');
  const accessMod = await import('@/lib/access-context');
  const accessManagerMod = await import('@/lib/access-manager');
  const perms = await import('@/lib/permissions');

  const session = await sessionMod.getSessionFromRequest({ headers: hdr } as any).catch(() => null);
  const userId = session?.userId;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="max-w-sm mx-auto text-center p-8">
          <h1 className="text-xl font-extrabold text-stone-900 mb-2">Accès requis</h1>
          <p className="text-sm text-stone-500 mb-6">Vous devez être connecté pour voir le code de vérification.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-emerald-800 text-white rounded-full font-bold text-sm hover:bg-emerald-900">Se connecter</a>
        </div>
      </div>
    );
  }

  try {
    const dist = await db.query.seedDistributions.findFirst({
      where: eq(schema.seedDistributions.id, distributionId),
      with: {
        allocation: { columns: { id: true, seedType: true, unit: true } },
        agent: { columns: { id: true, name: true } },
      },
    });

    if (!dist) notFound();

    // Contrôle d'accès
    const ctx = await accessMod.buildAccessContext(userId);
    let allowed = false;
    if (dist.agentId === userId) allowed = true;
    if (!allowed) {
      const producer = await db.query.producers.findFirst({
        where: eq(schema.producers.id, dist.producerId),
        columns: { userId: true },
      });
      if (producer?.userId === userId) allowed = true;
    }
    if (!allowed) {
      const resp = accessManagerMod.AccessManager.can(ctx)
        .permission(perms.PERMISSIONS.STOCK_VERIFY)
        .inOrg(dist.organizationId)
        .inZone(dist.zoneId)
        .toResponse();
      if (!resp) allowed = true;
    }

    if (!allowed) return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 font-bold">Accès refusé.</p>
      </div>
    );

    // Récupération du code OTP
    const actions = await db.query.agentActions.findMany({
      where: eq(schema.agentActions.actionType, 'SEND_DISTRIBUTION_OTP'),
      orderBy: [desc(schema.agentActions.createdAt)],
      limit: 100, // Augmenté pour plus de sécurité
    });

    let code: string | null = null;
    for (const action of actions) {
      const p = action.payload as any;
      const did = p?.distributionId || p?.distribution || p?.targetId;
      if (String(did) === String(distributionId)) {
        code = p.code || p.verificationCode || null;
        break;
      }
    }

    const isExpired = dist.status !== 'PENDING';
    const statusKey = (dist.status?.toUpperCase() ?? 'PENDING') as DistributionStatus;
    const badge = DIST_STATUS_BADGE[statusKey] || { bg: 'bg-stone-100', text: 'text-stone-500' };
    const statusLabel = DIST_STATUS_LABELS[statusKey] || dist.status;

    return (
      <div className="min-h-screen bg-stone-50 p-4 md:p-8">
        <div className="max-w-md mx-auto">
          
          {/* BOUTON RETOUR */}
          <Link 
            href="/buyer/dashboard" 
            className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-900 mb-6 transition-colors group"
          >
            <div className="p-2 rounded-full bg-white border border-stone-200 group-hover:border-stone-400">
              <ArrowLeft size={16} />
            </div>
            <span className="text-sm font-bold">Retour au tableau de bord</span>
          </Link>

          {/* Info Distribution */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold text-stone-900">{dist.allocation?.seedType || 'Semence'}</h2>
              <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wider ${badge.bg} ${badge.text}`}>
                {statusLabel}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-1">Quantité</span>
                <p className="font-black text-stone-800">{dist.quantity} <span className="text-[10px] opacity-60">{(dist.allocation as any)?.unit || 'KG'}</span></p>
              </div>
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 uppercase font-bold tracking-widest block mb-1">Agent</span>
                <p className="font-bold text-stone-800 truncate">{(dist as any).agent?.name || 'Non assigné'}</p>
              </div>
            </div>
          </div>

          {/* Section Code */}
          {isExpired ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-100/50 p-10 text-center">
              <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeft size={20} className="text-stone-400 rotate-90" />
              </div>
              <p className="text-stone-500 text-sm font-bold">Distribution archivée ou validée.</p>
              <p className="text-stone-400 text-xs mt-1">Aucun code actif pour ce statut.</p>
            </div>
          ) : code ? (
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-emerald-900/20" style={{ background: 'linear-gradient(135deg, #065F46 0%, #022C22 100%)' }}>
              <div className="p-8 text-center text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 mb-6 font-black">Code de vérification unique</p>
                <div className="font-mono text-6xl font-black tracking-[0.2em] mb-8 drop-shadow-lg">
                  {code}
                </div>
                <CopyButton code={String(code)} />
                <p className="mt-8 text-[11px] opacity-50 leading-relaxed max-w-[240px] mx-auto">
                  Montrez ce code à l&apos;agent distributeur pour confirmer la remise physique.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-10 text-center">
              <p className="text-stone-400 text-sm italic">Génération du code en cours ou indisponible...</p>
            </div>
          )}

          {/* Action supplémentaire */}
          {!isExpired && (
            <div className="mt-8">
              <a 
                href={`/distributions/verify/${distributionId}`} 
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-stone-900 text-white font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Confirmer la réception manuellement
              </a>
            </div>
          )}
        </div>
      </div>
    );
  } catch (err) {
    console.error('[distributions/code] error', err);
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
           <p className="text-stone-500 font-bold">Un problème est survenu.</p>
           <Link href="/buyer/dashboard" className="text-emerald-700 text-sm font-bold mt-4 block">Retourner au menu</Link>
        </div>
      </div>
    );
  }
}