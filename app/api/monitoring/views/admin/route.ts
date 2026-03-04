// app/api/monitoring/views/admin/route.ts
// =========================================================
// VUE ADMIN — Endpoint optimisé, single fetch
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, count, avg, sum } from 'drizzle-orm';
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
      totalConversationsResult,
      activeConversationsResult,
      // Agents uniques pour la santé
      agentNames,
    ] = await Promise.all([
      db.select({
        status: schema.agentActions.status,
        statusCount: count(),
      }).from(schema.agentActions).groupBy(schema.agentActions.status),

      db.query.agentActions.findMany({
        where: eq(schema.agentActions.status, 'PENDING'),
        orderBy: (t, { desc: d, asc: a }) => [d(t.priority), a(t.createdAt)],
        limit: 15,
        with: {
          order: {
            columns: { id: true, totalAmount: true, status: true, customerName: true },
          },
          user: {
            columns: { id: true, name: true, role: true },
          },
        },
      }),

      db.query.conversations.findMany({
        orderBy: (t, { desc: d }) => [d(t.createdAt)],
        limit: 10,
        with: {
          user: { columns: { id: true, name: true, role: true } },
          zone: { columns: { id: true, name: true, code: true } },
        },
      }),

      db.select({
        avgConfidence: avg(schema.conversations.confidenceScore),
        avgResponseTime: avg(schema.conversations.responseTimeMs),
        totalTokens: sum(schema.conversations.totalTokensUsed),
      }).from(schema.conversations),

      db.select({ value: count() }).from(schema.conversations),
      db.select({ value: count() }).from(schema.conversations).where(eq(schema.conversations.isWaitingForInput, true)),
      db.select({
        agentName: schema.agentActions.agentName,
        agentCount: count(),
      }).from(schema.agentActions).groupBy(schema.agentActions.agentName),
    ]);

    // Build metrics
    const statusMap: Record<string, number> = {};
    let totalActions = 0;
    actionCounts.forEach((c) => {
      statusMap[c.status] = Number(c.statusCount);
      totalActions += Number(c.statusCount);
    });

    const totalConversations = Number(totalConversationsResult[0]?.value ?? 0);
    const activeConversations = Number(activeConversationsResult[0]?.value ?? 0);

    // Build agent health (simplified for overview)
    const agentHealth = await Promise.all(
      agentNames.map(async (a) => {
        const lastAction = await db.query.agentActions.findFirst({
          where: eq(schema.agentActions.agentName, a.agentName),
          orderBy: (t, { desc: d }) => [d(t.createdAt)],
          columns: { createdAt: true },
        });
        const [failedResult] = await db.select({ value: count() }).from(schema.agentActions).where(
          and(
            eq(schema.agentActions.agentName, a.agentName),
            eq(schema.agentActions.status, 'FAILED'),
            gte(schema.agentActions.createdAt, twentyFourHoursAgo),
          )
        );
        const [last24hResult] = await db.select({ value: count() }).from(schema.agentActions).where(
          and(
            eq(schema.agentActions.agentName, a.agentName),
            gte(schema.agentActions.createdAt, twentyFourHoursAgo),
          )
        );

        const failedCount = Number(failedResult?.value ?? 0);
        const last24hCount = Number(last24hResult?.value ?? 0);
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
      actionsByAgentMap[a.agentName] = Number(a.agentCount);
    });

    const agg = conversationAggregates[0];

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
        avgConfidenceScore: Number(agg?.avgConfidence) || 0,
        avgResponseTimeMs: Number(agg?.avgResponseTime) || 0,
        totalTokensUsed: Number(agg?.totalTokens) || 0,
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
