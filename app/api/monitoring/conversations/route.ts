// app/api/monitoring/conversations/route.ts
// =========================================================
// API CONVERSATIONS — Liste paginée avec filtres
// Accès : ADMIN = tout, PRODUCER/USER = ses conversations
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

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
    const where: Prisma.ConversationWhereInput = {};

    // Permission-based scoping
    const canViewAll = await userHasPermission(user.id, 'CONVERSATION_VIEW_ALL');
    if (canViewAll && userId) {
      where.userId = userId; // utilisateur avec permission peut filtrer par utilisateur
    } else if (!canViewAll) {
      where.userId = user.id; // les autres ne voient que les leurs
    }

    if (agentType) where.agentType = agentType;
    if (zoneId) where.zoneId = zoneId;
    if (mode) where.mode = mode;
    if (waitingOnly) where.isWaitingForInput = true;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { crop: { contains: search, mode: 'insensitive' } },
        { agentType: { contains: search, mode: 'insensitive' } },
      ];
    }

    const totalCount = await prisma.conversation.count({ where });

    const conversations = await prisma.conversation.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: sortOrder },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
        zone: {
          select: { id: true, name: true, code: true },
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
