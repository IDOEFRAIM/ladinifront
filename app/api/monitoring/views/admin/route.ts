// app/api/monitoring/views/admin/route.ts
// =========================================================
// VUE ADMIN — Endpoint optimisé, single fetch
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { fetchAdminView } = await import('@/app/actions/monitoring.server');
    const result = await fetchAdminView();
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/views/admin error:', err);
    return NextResponse.json({ error: 'Erreur lors du chargement de la vue admin.' }, { status: 500 });
  }
}
