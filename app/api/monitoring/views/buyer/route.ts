// app/api/monitoring/views/buyer/route.ts
// =========================================================
// VUE ACHETEUR — Conversations et commandes agents
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const { fetchBuyerView } = await import('@/app/actions/monitoring.server');
    const result = await fetchBuyerView(ctx.userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/views/buyer error:', err);
    return NextResponse.json({ error: 'Erreur lors du chargement de la vue acheteur.' }, { status: 500 });
  }
}
