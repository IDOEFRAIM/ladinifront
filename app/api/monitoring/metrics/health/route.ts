// app/api/monitoring/metrics/health/route.ts
// =========================================================
// API SANTÉ DES AGENTS — État de chaque agent
// Accès : ADMIN uniquement
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;
  try {
    const { fetchAdminView } = await import('@/app/actions/monitoring.server');
    const result = await fetchAdminView();
    return NextResponse.json(result.agentHealth);
  } catch (err) {
    console.error('[API] /monitoring/metrics/health error (delegated):', err);
    return NextResponse.json({ error: 'Erreur lors du calcul de la santé des agents.' }, { status: 500 });
  }
}
