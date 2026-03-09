// app/api/monitoring/actions/route.ts
// =========================================================
// API AGENT ACTIONS — Liste paginée + Compteurs
// Accès : ADMIN = tout, PRODUCER = ses actions, USER/BUYER = ses actions
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchAgentActions } from '@/app/actions/monitoring.server';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const params = req.nextUrl.searchParams;
    const cursor = params.get('cursor') || undefined;
    const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
    const sortBy = params.get('sortBy') || 'createdAt';
    const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const filters = {
      agentName: params.get('agentName'),
      actionType: params.get('actionType'),
      status: params.get('status'),
      priority: params.get('priority'),
      dateFrom: params.get('dateFrom'),
      dateTo: params.get('dateTo'),
      search: params.get('search'),
    };

    const result = await fetchAgentActions({
      userId: ctx.userId,
      cursor,
      limit,
      sortBy,
      sortOrder,
      filters,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/actions GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des actions.' },
      { status: 500 }
    );
  }
}
