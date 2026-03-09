// app/api/monitoring/actions/counts/route.ts
// =========================================================
// Compteurs d'actions par statut (pour badges temps réel)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchAgentActionCounts } from '@/app/actions/monitoring.server';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const counts = await fetchAgentActionCounts(ctx.userId);
    return NextResponse.json(counts);
  } catch (err) {
    console.error('[API] /monitoring/actions/counts error:', err);
    return NextResponse.json({ error: 'Erreur compteurs' }, { status: 500 });
  }
}
