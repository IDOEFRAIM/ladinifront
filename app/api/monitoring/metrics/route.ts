// app/api/monitoring/metrics/route.ts
// =========================================================
// API MÉTRIQUES — Agrégats globaux pour le dashboard
// Accès : Tous authentifiés, scope par rôle
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  try {
    // Date range filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Permission-based scoping
    const canViewActionsAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    const canViewConversationsAll = await userHasPermission(user.id, 'CONVERSATION_VIEW_ALL');
    const actionScope = canViewActionsAll ? {} : { userId: user.id };
    const conversationScope = canViewConversationsAll ? {} : { userId: user.id };

    // --- Parallel queries pour la performance ---
    const [
      actionStatusCounts,
      totalConversations,
      activeConversations,
      conversationAggregates,
      actionsByAgent,
      conversationsByAgent,
      actionsTimeSeries,
      conversationsTimeSeries,
    ] = await Promise.all([
      // 1. Actions par statut
      prisma.agentAction.groupBy({
        by: ['status'],
        where: {
          ...actionScope,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        _count: { status: true },
      }),

      // 2. Total conversations
      prisma.conversation.count({
        where: {
          ...conversationScope,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
      }),

      // 3. Conversations actives (en attente d'input)
      prisma.conversation.count({
        where: {
          ...conversationScope,
          isWaitingForInput: true,
        },
      }),

      // 4. Aggrégats conversations (confiance, temps réponse, tokens)
      prisma.conversation.aggregate({
        where: {
          ...conversationScope,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        _avg: {
          confidenceScore: true,
          responseTimeMs: true,
        },
        _sum: {
          totalTokensUsed: true,
        },
      }),

      // 5. Actions par agent
      prisma.agentAction.groupBy({
        by: ['agentName'],
        where: {
          ...actionScope,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        _count: { agentName: true },
      }),

      // 6. Conversations par type d'agent
      prisma.conversation.groupBy({
        by: ['agentType'],
        where: {
          ...conversationScope,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
          agentType: { not: null },
        },
        _count: { agentType: true },
      }),

      // 7. Time series actions (dernier 30 jours, par jour)
      prisma.$queryRaw`
        SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
        FROM agent_actions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${!canViewActionsAll ? prisma.$queryRaw`AND user_id = ${user.id}` : prisma.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY timestamp ASC
      `,

      // 8. Time series conversations (dernier 30 jours, par jour)
      prisma.$queryRaw`
        SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
        FROM conversations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${!canViewConversationsAll ? prisma.$queryRaw`AND user_id = ${user.id}` : prisma.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY timestamp ASC
      `,
    ]);

    // Build status counts
    const statusMap: Record<string, number> = {};
    let totalActions = 0;
    actionStatusCounts.forEach((c) => {
      statusMap[c.status] = c._count.status;
      totalActions += c._count.status;
    });

    // Build agent maps
    const actionsByAgentMap: Record<string, number> = {};
    actionsByAgent.forEach((a) => {
      actionsByAgentMap[a.agentName] = a._count.agentName;
    });

    const conversationsByAgentMap: Record<string, number> = {};
    conversationsByAgent.forEach((c) => {
      if (c.agentType) {
        conversationsByAgentMap[c.agentType] = c._count.agentType;
      }
    });

    return NextResponse.json({
      totalActions,
      pendingActions: statusMap['PENDING'] || 0,
      approvedActions: statusMap['APPROVED'] || 0,
      rejectedActions: statusMap['REJECTED'] || 0,
      executedActions: statusMap['EXECUTED'] || 0,
      failedActions: statusMap['FAILED'] || 0,

      totalConversations,
      activeConversations,

      avgConfidenceScore: conversationAggregates._avg.confidenceScore || 0,
      avgResponseTimeMs: conversationAggregates._avg.responseTimeMs || 0,
      totalTokensUsed: conversationAggregates._sum.totalTokensUsed || 0,

      actionsByAgent: actionsByAgentMap,
      conversationsByAgent: conversationsByAgentMap,

      actionsOverTime: actionsTimeSeries,
      conversationsOverTime: conversationsTimeSeries,
      tokensOverTime: [], // Could add token time series if needed
    });
  } catch (err) {
    console.error('[API] /monitoring/metrics GET error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du calcul des métriques.' },
      { status: 500 }
    );
  }
}
