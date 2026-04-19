import React from 'react';
import { db, schema } from '@/src/db';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export default async function Page() {
  let rows: any[] = [];
  let dbError: any = null;
  try {
    const sessionMod = await import('@/lib/session');
    const hdr = await headers();
    const session = await sessionMod.getSessionFromRequest({ headers: hdr } as any).catch(() => null);
    const userId = session?.userId;
    // Dev debugging: if cookie header exists but session is null, log cookie names to server console
    if (process.env.NODE_ENV !== 'production' && !userId) {
      try {
        const cookieHeader = String(hdr.get('cookie') || '');
        if (cookieHeader) {
          const names = cookieHeader
            .split(';')
            .map((p: string) => p.split('=')[0].trim())
            .filter(Boolean);
          // eslint-disable-next-line no-console
          console.debug('[distributions/page] cookie header contains:', names.join(','));
        } else {
          // eslint-disable-next-line no-console
          console.debug('[distributions/page] no cookie header present on request');
        }
      } catch (e) {
        // ignore
      }
    }
    if (!userId)
      return (
        <div className="p-6">
          <p>Vous devez être connecté pour voir vos distributions.</p>
          <p style={{ marginTop: 8 }}>
            <a href="/login" style={{ color: '#0ea5e9' }}>Se connecter</a> ou créer un compte pour continuer.
          </p>
        </div>
      );

    const accessMod = await import('@/lib/access-context');
    const ctx = await accessMod.buildAccessContext(userId);
    if (!ctx || !ctx.producerId) return <div className="p-6">Aucune distribution en attente pour votre compte.</div>;

    const rowsWith = await db.query.seedDistributions.findMany({
      where: eq(schema.seedDistributions.producerId, ctx.producerId),
      limit: 200,
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      with: {
        allocation: { columns: { id: true, seedType: true } },
        agent: { columns: { id: true, name: true } },
      },
    });
    rows = rowsWith.filter((r: any) => r.status === 'PENDING');
    if (process.env.NODE_ENV !== 'production') {
      try {
        // Log ids being rendered to help debug missing param
        const ids = rows.map((r: any) => r.id).slice(0, 50);
        // eslint-disable-next-line no-console
        console.debug('[distributions/page] rendering distribution ids:', ids.join(','));
      } catch (e) {}
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[distributions/verify] DB query failed:', err);
    dbError = err;
    rows = [];
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Mes distributions en attente</h1>
      <p>Choisissez la distribution à confirmer.</p>

      {dbError ? (
        <div style={{ color: 'crimson', marginBottom: 12 }}>Error loading distributions: {(dbError && dbError.message) || 'unknown error'}</div>
      ) : null}

      {rows.length === 0 ? (
        <div style={{ marginTop: 12 }}>Aucune distribution en attente.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {rows.map((r: any) => (
            <li key={r.id} style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.allocation ? r.allocation.seedType || r.allocation.id : r.allocationId}</div>
                <div style={{ color: '#666', fontSize: 13 }}>Agent: {r.agent ? (r.agent.name || r.agent.id) : r.agentId} • Qty: {r.quantity}</div>
                <div style={{ color: '#666', fontSize: 12, marginTop: 6 }}>ID: {r.id}</div>
              </div>
              <div>
                <a href={`/distributions/verify/${r.id}`} style={{ background: '#0ea5e9', color: 'white', padding: '8px 12px', borderRadius: 6, textDecoration: 'none' }}>Confirmer</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
