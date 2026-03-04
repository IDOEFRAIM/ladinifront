// app/api/monitoring/actions/route.ts
// =========================================================
// API AGENT ACTIONS — Liste paginée + Compteurs
// Accès : ADMIN = tout, PRODUCER = ses actions, USER/BUYER = ses actions
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, or, ilike, count } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const user: any = { id: ctx.userId, role: ctx.role };

  const params = req.nextUrl.searchParams;
  const cursor = params.get('cursor') || undefined;
  const limit = Math.min(parseInt(params.get('limit') || '20'), 100);
  const sortBy = params.get('sortBy') || 'createdAt';
  const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Filtres
  const agentName = params.get('agentName');
  const actionType = params.get('actionType');
  const status = params.get('status');
  const priority = params.get('priority');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const search = params.get('search');

  try {
    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Permission-based scoping: prefer explicit permission over system-role checks
    const canViewAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    if (!canViewAll) {
      conditions.push(eq(schema.agentActions.userId, user.id));
    }

    // Filtres
    if (agentName) conditions.push(eq(schema.agentActions.agentName, agentName));
    if (actionType) conditions.push(eq(schema.agentActions.actionType, actionType));
    if (status) conditions.push(eq(schema.agentActions.status, status as any));
    if (priority) conditions.push(eq(schema.agentActions.priority, priority as any));
    if (dateFrom) conditions.push(gte(schema.agentActions.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(schema.agentActions.createdAt, new Date(dateTo)));
    if (search) {
      conditions.push(
        or(
          ilike(schema.agentActions.agentName, `%${search}%`),
          ilike(schema.agentActions.actionType, `%${search}%`),
          ilike(schema.agentActions.aiReasoning, `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count (cached pour la session)
    const [{ value: totalCount }] = await db.select({ value: count() }).from(schema.agentActions).where(whereClause);

    // Cursor-based pagination
    const actions = await db.query.agentActions.findMany({
      where: whereClause,
      limit: limit + 1, // +1 pour savoir s'il y a plus
      offset: cursor ? 1 : 0,
      orderBy: sortOrder === 'asc'
        ? (t, ops) => [ops.asc(t[sortBy as keyof typeof t] as any)]
        : (t, ops) => [ops.desc(t[sortBy as keyof typeof t] as any)],
      with: {
        order: {
          columns: {
            id: true,
            totalAmount: true,
            status: true,
            customerName: true,
          },
        },
        user: {
          columns: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const hasMore = actions.length > limit;
    const data = hasMore ? actions.slice(0, limit) : actions;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return NextResponse.json({
      data,
      nextCursor,
      totalCount,
      hasMore,
    });
  } catch (err) {
    console.error('[API] /monitoring/actions GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des actions.' },
      { status: 500 }
    );
  }
}
