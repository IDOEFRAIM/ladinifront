// app/api/monitoring/actions/route.ts
// =========================================================
// API AGENT ACTIONS — Liste paginée + Compteurs
// Accès : ADMIN = tout, PRODUCER = ses actions, USER/BUYER = ses actions
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
    // Build WHERE clause based on role
    const where: Prisma.AgentActionWhereInput = {};

    // Permission-based scoping: prefer explicit permission over system-role checks
    const canViewAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    if (!canViewAll) {
      where.userId = user.id;
    }

    // Filtres
    if (agentName) where.agentName = agentName;
    if (actionType) where.actionType = actionType;
    if (status) where.status = status as Prisma.EnumAgentActionStatusFilter;
    if (priority) where.priority = priority as Prisma.EnumValidationPriorityFilter;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { agentName: { contains: search, mode: 'insensitive' } },
        { actionType: { contains: search, mode: 'insensitive' } },
        { aiReasoning: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Total count (cached pour la session)
    const totalCount = await prisma.agentAction.count({ where });

    // Cursor-based pagination
    const actions = await prisma.agentAction.findMany({
      where,
      take: limit + 1, // +1 pour savoir s'il y a plus
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { [sortBy]: sortOrder },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            customerName: true,
          },
        },
        user: {
          select: {
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
