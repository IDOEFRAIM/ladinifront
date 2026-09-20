import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, count, avg, sum, sql, desc, inArray } from 'drizzle-orm';

export async function fetchAdminView() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    actionCounts,
    pendingActions,
    recentConversations,
    conversationAggregates,
    totalConversationsResult,
    activeConversationsResult,
    agentNames,
  ] = await Promise.all([
    db.select({ status: schema.agentActions.status, statusCount: count() }).from(schema.agentActions).groupBy(schema.agentActions.status),

    db.query.agentActions.findMany({
      where: eq(schema.agentActions.status, 'PENDING'),
      orderBy: (t, { desc: d, asc: a }) => [d(t.priority), a(t.createdAt)],
      limit: 15,
      with: {
        order: { columns: { id: true, totalAmount: true, status: true, customerName: true } },
        user: { columns: { id: true, name: true, role: true } },
      },
    }),

    db.query.conversations.findMany({ orderBy: (t, { desc: d }) => [d(t.createdAt)], limit: 10, with: { user: { columns: { id: true, name: true, role: true } }, zone: { columns: { id: true, name: true, code: true } } } }),

    db.select({ avgConfidence: avg(schema.conversations.confidenceScore), avgResponseTime: avg(schema.conversations.responseTimeMs), totalTokens: sum(schema.conversations.totalTokensUsed) }).from(schema.conversations),

    db.select({ value: count() }).from(schema.conversations),
    db.select({ value: count() }).from(schema.conversations).where(eq(schema.conversations.isWaitingForInput, true)),
    db.select({ agentName: schema.agentActions.agentName, agentCount: count() }).from(schema.agentActions).groupBy(schema.agentActions.agentName),
  ]);

  const statusMap: Record<string, number> = {};
  let totalActions = 0;
  actionCounts.forEach((c) => { statusMap[c.status] = Number(c.statusCount); totalActions += Number(c.statusCount); });

  const totalConversations = Number(totalConversationsResult[0]?.value ?? 0);
  const activeConversations = Number(activeConversationsResult[0]?.value ?? 0);

  // ⚠️ Important: no DB calls inside loops/maps (serverless hardening)
  const [lastActivityRows, last24hRows] = await Promise.all([
    db
      .select({
        agentName: schema.agentActions.agentName,
        lastActivityAt: sql<Date>`MAX(${schema.agentActions.createdAt})`,
      })
      .from(schema.agentActions)
      .groupBy(schema.agentActions.agentName),

    db
      .select({
        agentName: schema.agentActions.agentName,
        actionsLast24h: count(),
        failedLast24h: sql<number>`SUM(CASE WHEN ${schema.agentActions.status} = 'FAILED' THEN 1 ELSE 0 END)`,
      })
      .from(schema.agentActions)
      .where(gte(schema.agentActions.createdAt, twentyFourHoursAgo))
      .groupBy(schema.agentActions.agentName),
  ]);

  const lastActivityByAgent = new Map<string, Date>();
  for (const r of lastActivityRows) {
    if (r.agentName && r.lastActivityAt) lastActivityByAgent.set(r.agentName, r.lastActivityAt);
  }

  const last24hByAgent = new Map<string, { actions: number; failed: number }>();
  for (const r of last24hRows) {
    last24hByAgent.set(r.agentName, {
      actions: Number(r.actionsLast24h ?? 0),
      failed: Number(r.failedLast24h ?? 0),
    });
  }

  const agentHealth = agentNames.map((a) => {
    const lastActivityAt = lastActivityByAgent.get(a.agentName);
    const last24h = last24hByAgent.get(a.agentName) ?? { actions: 0, failed: 0 };
    const errorRate = last24h.actions > 0 ? last24h.failed / last24h.actions : 0;
    const isRecent = !!lastActivityAt && lastActivityAt > oneHourAgo;

    return {
      agentName: a.agentName,
      status: !lastActivityAt ? 'unknown' : !isRecent ? 'down' : errorRate > 0.3 ? 'degraded' : 'healthy',
      lastActivityAt: lastActivityAt?.toISOString(),
      actionsLast24h: last24h.actions,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTimeMs: 0,
    };
  });

  const actionsByAgentMap: Record<string, number> = {};
  agentNames.forEach((a) => { actionsByAgentMap[a.agentName] = Number(a.agentCount); });

  const agg = conversationAggregates[0];

  return {
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
  };
}

export async function fetchProducerView(userId: string) {
  const [ myActions, myConversations, agentSuggestions, totalInteractionsResult, avgResponseTimeResult ] = await Promise.all([
    db.query.agentActions.findMany({ where: eq(schema.agentActions.userId, userId), orderBy: (t, { desc: d }) => [d(t.createdAt)], limit: 20, with: { order: { columns: { id: true, totalAmount: true, status: true, customerName: true } } } }),
    db.query.conversations.findMany({ where: eq(schema.conversations.userId, userId), orderBy: (t, { desc: d }) => [d(t.createdAt)], limit: 15, with: { zone: { columns: { id: true, name: true, code: true } } } }),
    db.query.agentActions.findMany({ where: eq(schema.agentActions.userId, userId), orderBy: (t, { desc: d }) => [d(t.priority)], limit: 10 }),
    db.select({ value: count() }).from(schema.conversations).where(eq(schema.conversations.userId, userId)),
    db.select({ avgMs: avg(schema.conversations.responseTimeMs) }).from(schema.conversations).where(eq(schema.conversations.userId, userId)),
  ]);

  const agentUsage = myConversations.reduce<Record<string, number>>((acc, c) => { if (c.agentType) acc[c.agentType] = (acc[c.agentType] || 0) + 1; return acc; }, {});
  const topAgentUsed = Object.entries(agentUsage).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  return {
    myActions,
    myConversations,
    agentSuggestions,
    performanceMetrics: {
      totalInteractions: Number(totalInteractionsResult[0]?.value ?? 0),
      avgResponseTime: Math.round(Number(avgResponseTimeResult[0]?.avgMs) || 0),
      topAgentUsed,
    },
  };
}

export async function fetchBuyerView(userId: string) {
  const [ conversations, agentOrders, waitingForInput ] = await Promise.all([
    db.query.conversations.findMany({ where: eq(schema.conversations.userId, userId), orderBy: (t, ops) => [ops.desc(t.createdAt)], limit: 20, with: { zone: { columns: { id: true, name: true, code: true } } } }),
    db.query.agentActions.findMany({ where: and(eq(schema.agentActions.userId, userId), inArray(schema.agentActions.actionType, ['PURCHASE', 'ORDER_CREATED'])), orderBy: (t, ops) => [ops.desc(t.createdAt)], limit: 10, with: { order: { columns: { id: true, totalAmount: true, status: true, customerName: true } } } }),
    db.query.conversations.findMany({ where: and(eq(schema.conversations.userId, userId), eq(schema.conversations.isWaitingForInput, true)), orderBy: (t, ops) => [ops.desc(t.createdAt)], limit: 5 }),
  ]);

  return { conversations, agentOrders, waitingForInput };
}
