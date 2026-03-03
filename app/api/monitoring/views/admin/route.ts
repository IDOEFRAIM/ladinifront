// app/api/monitoring/views/admin/route.ts
// =========================================================
// VUE ADMIN — Endpoint optimisé, single fetch
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [
      // Métriques actions
      actionCounts,
      // Actions en attente (les plus urgentes en premier)
      pendingActions,
      // Conversations récentes
      recentConversations,
      // Métriques conversations
      conversationAggregates,
      totalConversations,
      activeConversations,
      // Agents uniques pour la santé
      agentNames,
    ] = await Promise.all([
      prisma.agentAction.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.agentAction.findMany({
        where: { status: 'PENDING' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 15,
        include: {
          order: {
            select: { id: true, totalAmount: true, status: true, customerName: true },
          },
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      prisma.conversation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true, role: true } },
          zone: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.conversation.aggregate({
        _avg: { confidenceScore: true, responseTimeMs: true },
        _sum: { totalTokensUsed: true },
      }),
      prisma.conversation.count(),
      prisma.conversation.count({ where: { isWaitingForInput: true } }),
      prisma.agentAction.groupBy({ by: ['agentName'], _count: { agentName: true } }),
    ]);

    // Build metrics
    const statusMap: Record<string, number> = {};
    let totalActions = 0;
    actionCounts.forEach((c) => {
      statusMap[c.status] = c._count.status;
      totalActions += c._count.status;
    });

    // Build agent health (simplified for overview)
    const agentHealth = await Promise.all(
      agentNames.map(async (a) => {
        const lastAction = await prisma.agentAction.findFirst({
          where: { agentName: a.agentName },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        const failedCount = await prisma.agentAction.count({
          where: {
            agentName: a.agentName,
            status: 'FAILED',
            createdAt: { gte: twentyFourHoursAgo },
          },
        });
        const last24hCount = await prisma.agentAction.count({
          where: {
            agentName: a.agentName,
            createdAt: { gte: twentyFourHoursAgo },
          },
        });

        const errorRate = last24hCount > 0 ? failedCount / last24hCount : 0;
        const isRecent = lastAction?.createdAt && lastAction.createdAt > oneHourAgo;

        return {
          agentName: a.agentName,
          status: !lastAction?.createdAt
            ? 'unknown'
            : !isRecent
            ? 'down'
            : errorRate > 0.3
            ? 'degraded'
            : 'healthy',
          lastActivityAt: lastAction?.createdAt?.toISOString(),
          actionsLast24h: last24hCount,
          errorRate: Math.round(errorRate * 100) / 100,
          avgResponseTimeMs: 0,
        };
      })
    );

    const actionsByAgentMap: Record<string, number> = {};
    agentNames.forEach((a) => {
      actionsByAgentMap[a.agentName] = a._count.agentName;
    });

    return NextResponse.json({
      metrics: {
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
        conversationsByAgent: {},
        actionsOverTime: [],
        conversationsOverTime: [],
        tokensOverTime: [],
      },
      pendingActions,
      recentConversations,
      agentHealth,
    });
  } catch (err) {
    console.error('[API] /monitoring/views/admin error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la vue admin.' },
      { status: 500 }
    );
  }
}
