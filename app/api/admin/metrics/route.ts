import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { getAdminDashboardStats } from '@/services/admin.service';

export async function GET(req: NextRequest) {
  try {
    console.log('[API] /admin/metrics request url:', req.url);
    try { console.log('[API] /admin/metrics headers:', Object.fromEntries(req.headers)); } catch (e) { console.log('[API] headers read error', e); }
    try { console.log('[API] /admin/metrics cookie header:', req.headers.get('cookie')); } catch (e) { /* ignore */ }
  } catch (e) {
    console.error('[API] /admin/metrics pre-log error:', e);
  }

  const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
  console.log('[API] /admin/metrics auth result:', { hasContext: !!ctx, error: error || null });
  if (error || !ctx) {
    console.warn('[API] /admin/metrics unauthorized access attempt,error:',error);
    return NextResponse.json({ error: 'Non autorisé dude.' }, { status: 401 });
  }

  try {
    const stats = await getAdminDashboardStats();
    console.log('[API] /admin/metrics stats computed, keys:', Object.keys(stats || {}));
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[API] /admin/metrics error:', err);
    return NextResponse.json({ success: false, error: 'Erreur lors du calcul des métriques.' }, { status: 500 });
  }
}
