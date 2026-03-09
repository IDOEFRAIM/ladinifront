// app/actions/monitoring.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, or, ilike, count, avg, sum, sql, gt, lt, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { userHasPermission } from '@/services/role.service';
import { inArray } from 'drizzle-orm';

type FetchAgentActionsOpts = {
  userId: string;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    agentName?: string | null;
    actionType?: string | null;
    status?: string | null;
    priority?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
  };
};

export async function fetchAgentActions(opts: FetchAgentActionsOpts) {
  const {
    userId,
    cursor,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filters = {},
  } = opts;

  const canViewAll = await userHasPermission(userId, 'AGENT_ACTION_VIEW_ALL');

  const conditions: any[] = [];
  if (!canViewAll) {
    conditions.push(eq(schema.agentActions.userId, userId));
  }

  if (filters.agentName) conditions.push(eq(schema.agentActions.agentName, filters.agentName));
  if (filters.actionType) conditions.push(eq(schema.agentActions.actionType, filters.actionType));
  if (filters.status) conditions.push(eq(schema.agentActions.status, filters.status));
  if (filters.priority) conditions.push(eq(schema.agentActions.priority, filters.priority));
  if (filters.dateFrom) conditions.push(gte(schema.agentActions.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(schema.agentActions.createdAt, new Date(filters.dateTo)));
  if (filters.search) {
    conditions.push(
      or(
        ilike(schema.agentActions.agentName, `%${filters.search}%`),
        ilike(schema.agentActions.actionType, `%${filters.search}%`),
        ilike(schema.agentActions.aiReasoning, `%${filters.search}%`),
      ) as unknown as any,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: totalCount }] = await db.select({ value: count() }).from(schema.agentActions).where(whereClause);

  const take = Math.min(limit, 100);

  const actions = await db.query.agentActions.findMany({
    where: whereClause,
    limit: take + 1,
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

  const hasMore = actions.length > take;
  const data = hasMore ? actions.slice(0, take) : actions;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return {
    data,
    nextCursor,
    totalCount,
    hasMore,
  };
}

export async function fetchAgentActionCounts(userId: string) {
  const canViewAll = await userHasPermission(userId, 'AGENT_ACTION_VIEW_ALL');
  const whereClause = canViewAll ? undefined : eq(schema.agentActions.userId, userId);

  const counts = await db
    .select({ status: schema.agentActions.status, value: count() })
    .from(schema.agentActions)
    .where(whereClause)
    .groupBy(schema.agentActions.status);

  const result: Record<string, number> = {};
  counts.forEach((c) => {
    result[c.status] = c.value;
  });
  return result;
}

export async function approveAgentAction(actionId: string, approverId: string, decision: 'APPROVED' | 'REJECTED', adminNotes?: string) {
  const canApprove = await userHasPermission(approverId, 'AGENT_ACTION_APPROVE');
  if (!canApprove) throw new Error('INSUFFICIENT_PERMISSIONS');

  const action = await db.query.agentActions.findFirst({ where: eq(schema.agentActions.id, actionId) });
  if (!action) throw new Error('NOT_FOUND');
  if (action.status !== 'PENDING') throw new Error('ALREADY_PROCESSED');

  await db.update(schema.agentActions)
    .set({
      status: decision,
      adminNotes: adminNotes || null,
      validatedById: approverId,
    })
    .where(eq(schema.agentActions.id, actionId));

  const updated = await db.query.agentActions.findFirst({
    where: eq(schema.agentActions.id, actionId),
    with: {
      order: { columns: { id: true, totalAmount: true, status: true, customerName: true } },
      user: { columns: { id: true, name: true, role: true } },
    },
  });

  return updated;
}

export async function bulkApproveAgentActions(approverId: string, actionIds: string[], decision: 'APPROVED' | 'REJECTED', adminNotes?: string) {
  const canApprove = await userHasPermission(approverId, 'AGENT_ACTION_APPROVE');
  if (!canApprove) throw new Error('INSUFFICIENT_PERMISSIONS');

  if (!Array.isArray(actionIds) || actionIds.length === 0) throw new Error('INVALID_INPUT');
  if (actionIds.length > 50) throw new Error('TOO_MANY');

  const result = await db.update(schema.agentActions)
    .set({
      status: decision,
      adminNotes: adminNotes || null,
      validatedById: approverId,
    })
    .where(
      and(
        inArray(schema.agentActions.id, actionIds),
        eq(schema.agentActions.status, 'PENDING'),
      )
    );

  // return number updated if driver's update returns a result array, otherwise the result itself
  // callers should inspect the returned value; routes can normalize to { updated: n }
  return result as any;
}

export async function fetchMonitoringMetrics(userId: string, dateFrom?: string | null, dateTo?: string | null) {
  const canViewActionsAll = await userHasPermission(userId, 'AGENT_ACTION_VIEW_ALL');
  const canViewConversationsAll = await userHasPermission(userId, 'CONVERSATION_VIEW_ALL');

  const actionConditions: (SQL | undefined)[] = [];
  if (!canViewActionsAll) actionConditions.push(eq(schema.agentActions.userId, userId));
  if (dateFrom) actionConditions.push(gte(schema.agentActions.createdAt, new Date(dateFrom)));
  if (dateTo) actionConditions.push(lte(schema.agentActions.createdAt, new Date(dateTo)));
  const actionWhere = actionConditions.length > 0 ? and(...actionConditions) : undefined;

  const convConditions: (SQL | undefined)[] = [];
  if (!canViewConversationsAll) convConditions.push(eq(schema.conversations.userId, userId));
  if (dateFrom) convConditions.push(gte(schema.conversations.createdAt, new Date(dateFrom)));
  if (dateTo) convConditions.push(lte(schema.conversations.createdAt, new Date(dateTo)));
  const convWhere = convConditions.length > 0 ? and(...convConditions) : undefined;

  const convActiveConditions: (SQL | undefined)[] = [];
  if (!canViewConversationsAll) convActiveConditions.push(eq(schema.conversations.userId, userId));
  convActiveConditions.push(eq(schema.conversations.isWaitingForInput, true));
  const convActiveWhere = and(...convActiveConditions);

  const [
    actionStatusCounts,
    totalConversationsResult,
    activeConversationsResult,
    conversationAggregates,
    actionsByAgent,
    conversationsByAgent,
    actionsTimeSeries,
    conversationsTimeSeries,
  ] = await Promise.all([
    db.select({ status: schema.agentActions.status, statusCount: count() }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.status),

    db.select({ value: count() }).from(schema.conversations).where(convWhere),

    db.select({ value: count() }).from(schema.conversations).where(convActiveWhere),

    db.select({
      avgConfidence: avg(schema.conversations.confidenceScore),
      avgResponseTime: avg(schema.conversations.responseTimeMs),
      totalTokens: sum(schema.conversations.totalTokensUsed),
    }).from(schema.conversations).where(convWhere),

    db.select({ agentName: schema.agentActions.agentName, agentCount: count() }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.agentName),

    db.select({ agentType: schema.agentActions.agentName, agentTypeCount: count() }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.agentName),

    db.execute(sql`
      SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
      FROM intelligence.agent_actions
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ${!canViewActionsAll ? sql`AND user_id = ${userId}` : sql``}
      GROUP BY DATE(created_at)
      ORDER BY timestamp ASC
    `),

    db.execute(sql`
      SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
      FROM intelligence.conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ${!canViewConversationsAll ? sql`AND user_id = ${userId}` : sql``}
      GROUP BY DATE(created_at)
      ORDER BY timestamp ASC
    `),
  ]);

  const statusMap: Record<string, number> = {};
  let totalActions = 0;
  actionStatusCounts.forEach((c) => {
    statusMap[c.status] = Number(c.statusCount);
    totalActions += Number(c.statusCount);
  });

  const totalConversations = Number(totalConversationsResult[0]?.value ?? 0);
  const activeConversations = Number(activeConversationsResult[0]?.value ?? 0);

  const actionsByAgentMap: Record<string, number> = {};
  actionsByAgent.forEach((a) => {
    actionsByAgentMap[a.agentName] = Number(a.agentCount);
  });

  const conversationsByAgentMap: Record<string, number> = {};
  conversationsByAgent.forEach((c) => {
    if (c.agentType) conversationsByAgentMap[c.agentType] = Number(c.agentTypeCount);
  });

  const agg = conversationAggregates[0];

  return {
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
    conversationsByAgent: conversationsByAgentMap,

    actionsOverTime: (actionsTimeSeries as any).rows ?? actionsTimeSeries,
    conversationsOverTime: (conversationsTimeSeries as any).rows ?? conversationsTimeSeries,
    tokensOverTime: [],
  };
}

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

  const agentHealth = await Promise.all(agentNames.map(async (a) => {
    const lastAction = await db.query.agentActions.findFirst({ where: eq(schema.agentActions.agentName, a.agentName), orderBy: (t, { desc: d }) => [d(t.createdAt)], columns: { createdAt: true } });
    const [failedResult] = await db.select({ value: count() }).from(schema.agentActions).where(and(eq(schema.agentActions.agentName, a.agentName), eq(schema.agentActions.status, 'FAILED'), gte(schema.agentActions.createdAt, twentyFourHoursAgo)));
    const [last24hResult] = await db.select({ value: count() }).from(schema.agentActions).where(and(eq(schema.agentActions.agentName, a.agentName), gte(schema.agentActions.createdAt, twentyFourHoursAgo)));

    const failedCount = Number(failedResult?.value ?? 0);
    const last24hCount = Number(last24hResult?.value ?? 0);
    const errorRate = last24hCount > 0 ? failedCount / last24hCount : 0;
    const isRecent = lastAction?.createdAt && lastAction.createdAt > oneHourAgo;

    return { agentName: a.agentName, status: !lastAction?.createdAt ? 'unknown' : !isRecent ? 'down' : errorRate > 0.3 ? 'degraded' : 'healthy', lastActivityAt: lastAction?.createdAt?.toISOString(), actionsLast24h: last24hCount, errorRate: Math.round(errorRate * 100) / 100, avgResponseTimeMs: 0 };
  }));

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

export async function fetchConversations(opts: {
  userId: string;
  cursor?: string;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    agentType?: string | null;
    userId?: string | null;
    zoneId?: string | null;
    mode?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
    waitingOnly?: boolean;
  };
}) {
  const { userId, cursor, limit = 20, sortOrder = 'desc', filters = {} } = opts;

  const canViewAll = await userHasPermission(userId, 'CONVERSATION_VIEW_ALL');

  const conditions: any[] = [];
  if (canViewAll && filters.userId) {
    conditions.push(eq(schema.conversations.userId, filters.userId));
  } else if (!canViewAll) {
    conditions.push(eq(schema.conversations.userId, userId));
  }

  if (filters.agentType) conditions.push(eq(schema.conversations.agentType, filters.agentType));
  if (filters.zoneId) conditions.push(eq(schema.conversations.zoneId, filters.zoneId));
  if (filters.mode) conditions.push(eq(schema.conversations.mode, filters.mode));
  if (filters.waitingOnly) conditions.push(eq(schema.conversations.isWaitingForInput, true));

  if (filters.dateFrom) conditions.push(gte(schema.conversations.createdAt, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(schema.conversations.createdAt, new Date(filters.dateTo)));

  if (filters.search) {
    conditions.push(
      or(
        ilike(schema.conversations.crop, `%${filters.search}%`),
        ilike(schema.conversations.agentType, `%${filters.search}%`),
      ) as unknown as any,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ value: totalCount }] = await db.select({ value: count() }).from(schema.conversations).where(whereClause);

  const take = Math.min(limit, 100);

  const conversations = await db.query.conversations.findMany({
    where: whereClause,
    limit: take + 1,
    offset: cursor ? 1 : 0,
    orderBy: sortOrder === 'asc' ? (t, ops) => [ops.asc(t.createdAt)] : (t, ops) => [ops.desc(t.createdAt)],
    with: {
      user: { columns: { id: true, name: true, role: true } },
      zone: { columns: { id: true, name: true, code: true } },
    },
  });

  const hasMore = conversations.length > take;
  const data = hasMore ? conversations.slice(0, take) : conversations;
  const nextCursor = hasMore ? data[data.length - 1]?.id : null;

  return { data, nextCursor, totalCount, hasMore };
}

export async function fetchStreamDeltas(userId: string, since: Date) {
  const canViewActionsAll = await userHasPermission(userId, 'AGENT_ACTION_VIEW_ALL');
  const canViewConversationsAll = await userHasPermission(userId, 'CONVERSATION_VIEW_ALL');

  const scope = canViewActionsAll ? {} : { userId };

  const newActionsWhere = scope.userId
    ? and(eq(schema.agentActions.userId, scope.userId), gt(schema.agentActions.createdAt, since))
    : gt(schema.agentActions.createdAt, since as any);
  const newActions = await db.query.agentActions.findMany({
    where: newActionsWhere,
    orderBy: (t, ops) => [ops.desc(t.createdAt)],
    limit: 10,
    with: { user: { columns: { id: true, name: true, role: true } } },
  });

  const convWhere = canViewConversationsAll
    ? gt(schema.conversations.createdAt, since as any)
    : and(eq(schema.conversations.userId, userId), gt(schema.conversations.createdAt, since as any));
  const newConversations = await db.query.conversations.findMany({ where: convWhere, orderBy: (t, ops) => [ops.desc(t.createdAt)], limit: 10 });

  const updatedWhere = scope.userId
    ? and(eq(schema.agentActions.userId, scope.userId), gt(schema.agentActions.updatedAt, since), lt(schema.agentActions.createdAt, since))
    : and(gt(schema.agentActions.updatedAt, since), lt(schema.agentActions.createdAt, since));
  const updatedActions = await db.query.agentActions.findMany({ where: updatedWhere, limit: 10 });

  return { newActions, newConversations, updatedActions };
}
