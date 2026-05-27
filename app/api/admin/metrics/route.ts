import { NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';

export async function GET() {
  const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
  if (error || !ctx) {
    return error ?? NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { fetchAdminMetrics } = await import('@/app/actions/admin.server');
    const stats = await fetchAdminMetrics();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[admin/metrics] error:', (err as Error).message);
    return NextResponse.json({ success: false, error: 'Erreur lors du calcul des métriques.' }, { status: 500 });
  }
}
