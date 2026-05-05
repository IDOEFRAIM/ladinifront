import React from 'react';
import { db, schema } from '@/src/db';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { Package, Clock, Eye, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const hdr = await headers();
  const sessionMod = await import('@/lib/session');
  const session = await sessionMod.getSessionFromRequest({ headers: hdr } as any).catch(() => null);
  const userId = session?.userId;

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-sm text-center">
          <Package size={40} className="mx-auto text-stone-300 mb-4" />
          <h1 className="text-lg font-bold text-stone-900 mb-2">Connexion requise</h1>
          <p className="text-sm text-stone-500 mb-6">Vous devez etre connecte pour voir vos distributions.</p>
          <a href="/login" className="inline-block px-6 py-3 bg-emerald-700 text-white rounded-full font-bold text-sm">Se connecter</a>
        </div>
      </div>
    );
  }

  const accessMod = await import('@/lib/access-context');
  const ctx = await accessMod.buildAccessContext(userId);

  if (!ctx?.producerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4">
        <div className="max-w-sm text-center">
          <Package size={40} className="mx-auto text-stone-300 mb-4" />
          <p className="text-sm text-stone-500">Aucune distribution en attente pour votre compte.</p>
        </div>
      </div>
    );
  }

  let rows: any[] = [];
  try {
    const rowsWith = await db.query.seedDistributions.findMany({
      where: eq(schema.seedDistributions.producerId, ctx.producerId),
      limit: 200,
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      with: {
        allocation: { columns: { id: true, seedType: true, unit: true } },
        agent: { columns: { id: true, name: true } },
      },
    });
    rows = rowsWith.filter((r: any) => r.status === 'PENDING');
  } catch (err) {
    console.error('[distributions/page] DB query failed:', err);
  }

  return (
    <div className="max-w-lg mx-auto p-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Package size={22} className="text-amber-600" />
        <h1 className="text-xl font-extrabold text-stone-900">Mes distributions</h1>
      </div>
      <p className="text-sm text-stone-500 mb-6">Choisissez la distribution a confirmer.</p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-10 text-center">
          <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-sm text-stone-500">Aucune distribution en attente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <div key={r.id} className="bg-white rounded-2xl border border-stone-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-stone-900">{r.allocation?.seedType || 'Semence'}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {r.quantity} {r.allocation?.unit || 'KG'} · Agent: {r.agent?.name || 'Non assigne'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  <Clock size={12} /> En attente
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/distributions/code/${r.id}`} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors">
                  <Eye size={14} /> Voir le code
                </a>
                <a href={`/distributions/verify/${r.id}`} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition-colors">
                  <CheckCircle2 size={14} /> Confirmer
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
