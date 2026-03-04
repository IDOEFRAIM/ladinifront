// app/api/monitoring/conversations/route.ts
// =========================================================
// API CONVERSATIONS — Liste paginée avec filtres
// Accès : ADMIN = tout, PRODUCER/USER = ses conversations
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, or, ilike, desc, asc, count } from 'drizzle-orm';
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
  const sortOrder = (params.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // Filtres
  const agentType = params.get('agentType');
  const userId = params.get('userId');
  const zoneId = params.get('zoneId');
  const mode = params.get('mode');
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  const search = params.get('search');
  const waitingOnly = params.get('waitingOnly') === 'true';

  try {
    // Build WHERE conditions
    const conditions: ReturnType<typeof eq>[] = [];

    // Permission-based scoping
    const canViewAll = await userHasPermission(user.id, 'CONVERSATION_VIEW_ALL');
    if (canViewAll && userId) {
      conditions.push(eq(schema.conversations.userId, userId));
    } else if (!canViewAll) {
      conditions.push(eq(schema.conversations.userId, user.id));
    }

    if (agentType) conditions.push(eq(schema.conversations.agentType, agentType));
    if (zoneId) conditions.push(eq(schema.conversations.zoneId, zoneId));
    if (mode) conditions.push(eq(schema.conversations.mode, mode));
    if (waitingOnly) conditions.push(eq(schema.conversations.isWaitingForInput, true));

    if (dateFrom) conditions.push(gte(schema.conversations.createdAt, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(schema.conversations.createdAt, new Date(dateTo)));

    if (search) {
      conditions.push(
        or(
          ilike(schema.conversations.crop, `%${search}%`),
          ilike(schema.conversations.agentType, `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: totalCount }] = await db.select({ value: count() }).from(schema.conversations).where(whereClause);

    const conversations = await db.query.conversations.findMany({
      where: whereClause,
      limit: limit + 1,
      offset: cursor ? 1 : 0,
      orderBy: sortOrder === 'asc'
        ? (t, ops) => [ops.asc(t.createdAt)]
        : (t, ops) => [ops.desc(t.createdAt)],
      with: {
        user: {
          columns: { id: true, name: true, role: true },
        },
        zone: {
          columns: { id: true, name: true, code: true },
        },
      },
    });

    const hasMore = conversations.length > limit;
    const data = hasMore ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasMore ? data[data.length - 1]?.id : null;

    return NextResponse.json({
      data,
      nextCursor,
      totalCount,
      hasMore,
    });
  } catch (err) {
    console.error('[API] /monitoring/conversations GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des conversations.' },
      { status: 500 }
    );
  }
}
