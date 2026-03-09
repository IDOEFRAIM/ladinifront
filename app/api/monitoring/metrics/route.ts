// app/api/monitoring/metrics/route.ts
// =========================================================
// API MÉTRIQUES — Agrégats globaux pour le dashboard
// Accès : Tous authentifiés, scope par rôle
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchMonitoringMetrics } from '@/app/actions/monitoring.server';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  try {
    const metrics = await fetchMonitoringMetrics(ctx.userId, dateFrom, dateTo);
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[API] /monitoring/metrics GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques.' },
      { status: 500 }
    );
  }
}
