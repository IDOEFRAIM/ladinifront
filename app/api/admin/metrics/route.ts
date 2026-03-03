import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { getAdminDashboardStats } from '@/services/admin.service';

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });

  try {
    const stats = await getAdminDashboardStats();
    console.log('[API] /admin/metrics stats:', stats);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[API] /admin/metrics error:', err);
    return NextResponse.json({ success: false, error: 'Erreur lors du calcul des métriques.' }, { status: 500 });
  }
}
