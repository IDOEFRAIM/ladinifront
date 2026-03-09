// app/api/monitoring/conversations/route.ts
// =========================================================
// API CONVERSATIONS — Liste paginée avec filtres
// Accès : ADMIN = tout, PRODUCER/USER = ses conversations
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchConversations } from '@/app/actions/monitoring.server';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const cursor = params.get('cursor') || undefined;
  const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
  const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const filters = {
    agentType: params.get('agentType'),
    userId: params.get('userId'),
    zoneId: params.get('zoneId'),
    mode: params.get('mode'),
    dateFrom: params.get('dateFrom'),
    dateTo: params.get('dateTo'),
    search: params.get('search'),
    waitingOnly: params.get('waitingOnly') === 'true',
  };

  try {
    const result = await fetchConversations({ userId: ctx.userId, cursor, limit, sortOrder, filters });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/conversations GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des conversations.' },
      { status: 500 }
    );
  }
}
