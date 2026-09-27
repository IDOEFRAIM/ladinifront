import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { getDbMetrics } from '@/lib/db-observe';
import { getServerConnectionStats } from '@/src/db';

export const dynamic = 'force-dynamic';

/**
 * Instantané des métriques DB du process courant (admin uniquement) — aucune URL ni identifiant.
 * `server_connections` = vue serveur (pg_stat_activity) de TOUS les clients de la base : site, site-auth, backend, workers…
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const local = getDbMetrics();
  let server: Awaited<ReturnType<typeof getServerConnectionStats>> | { error: string } = { error: 'indisponible' };
  try { server = await getServerConnectionStats(); } catch { /* métriques locales quand même */ }
  const siteRows = Array.isArray(server) ? server.filter((r) => r.app.startsWith('ladini-site')) : [];
  return NextResponse.json({
    ...local,
    db_pool_idle: siteRows.filter((r) => r.state === 'idle').reduce((a, r) => a + r.n, 0),
    db_connections_open: siteRows.reduce((a, r) => a + r.n, 0),
    server_connections: server,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
