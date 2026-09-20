import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, count, avg, sum, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { userHasPermission } from '@/features/organization/services/role.service';

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
