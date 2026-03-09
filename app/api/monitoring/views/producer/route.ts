// app/api/monitoring/views/producer/route.ts
// =========================================================
// VUE PRODUCTEUR — Actions et conversations liées
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireProducer } from '@/lib/api-guard';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await requireProducer(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const { fetchProducerView } = await import('@/app/actions/monitoring.server');
    const result = await fetchProducerView(user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/views/producer error:', err);
    return NextResponse.json({ error: 'Erreur lors du chargement de la vue producteur.' }, { status: 500 });
  }
}
