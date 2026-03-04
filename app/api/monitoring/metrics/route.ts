// app/api/monitoring/metrics/route.ts
// =========================================================
// API MÉTRIQUES — Agrégats globaux pour le dashboard
// Accès : Tous authentifiés, scope par rôle
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, count, avg, sum, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  // normalize minimal `user` object for compatibility with existing logic
  const user: any = { id: ctx.userId, role: ctx.role };

  const params = req.nextUrl.searchParams;
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');

  try {
    // Permission-based scoping
    const canViewActionsAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    const canViewConversationsAll = await userHasPermission(user.id, 'CONVERSATION_VIEW_ALL');

    // Build action conditions
    const actionConditions: (SQL | undefined)[] = [];
    if (!canViewActionsAll) actionConditions.push(eq(schema.agentActions.userId, user.id));
    if (dateFrom) actionConditions.push(gte(schema.agentActions.createdAt, new Date(dateFrom)));
    if (dateTo) actionConditions.push(lte(schema.agentActions.createdAt, new Date(dateTo)));
    const actionWhere = actionConditions.length > 0 ? and(...actionConditions) : undefined;

    // Build conversation conditions
    const convConditions: (SQL | undefined)[] = [];
    if (!canViewConversationsAll) convConditions.push(eq(schema.conversations.userId, user.id));
    if (dateFrom) convConditions.push(gte(schema.conversations.createdAt, new Date(dateFrom)));
    if (dateTo) convConditions.push(lte(schema.conversations.createdAt, new Date(dateTo)));
    const convWhere = convConditions.length > 0 ? and(...convConditions) : undefined;

    const convActiveConditions: (SQL | undefined)[] = [];
    if (!canViewConversationsAll) convActiveConditions.push(eq(schema.conversations.userId, user.id));
    convActiveConditions.push(eq(schema.conversations.isWaitingForInput, true));
    const convActiveWhere = and(...convActiveConditions);

    // --- Parallel queries pour la performance ---
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
      // 1. Actions par statut
      db.select({
        status: schema.agentActions.status,
        statusCount: count(),
      }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.status),

      // 2. Total conversations
      db.select({ value: count() }).from(schema.conversations).where(convWhere),

      // 3. Conversations actives (en attente d'input)
      db.select({ value: count() }).from(schema.conversations).where(convActiveWhere),

      // 4. Aggrégats conversations (confiance, temps réponse, tokens)
      db.select({
        avgConfidence: avg(schema.conversations.confidenceScore),
        avgResponseTime: avg(schema.conversations.responseTimeMs),
        totalTokens: sum(schema.conversations.totalTokensUsed),
      }).from(schema.conversations).where(convWhere),

      // 5. Actions par agent
      db.select({
        agentName: schema.agentActions.agentName,
        agentCount: count(),
      }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.agentName),

      // 6. Conversations par type d'agent
      db.select({
        agentType: schema.agentActions.agentName,
        agentTypeCount: count(),
      }).from(schema.agentActions).where(actionWhere).groupBy(schema.agentActions.agentName),

      // 7. Time series actions (dernier 30 jours, par jour)
      db.execute(sql`
        SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
        FROM intelligence.agent_actions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${!canViewActionsAll ? sql`AND user_id = ${user.id}` : sql``}
        GROUP BY DATE(created_at)
        ORDER BY timestamp ASC
      `),

      // 8. Time series conversations (dernier 30 jours, par jour)
      db.execute(sql`
        SELECT DATE(created_at) as timestamp, COUNT(*)::int as value
        FROM intelligence.conversations
        WHERE created_at >= NOW() - INTERVAL '30 days'
        ${!canViewConversationsAll ? sql`AND user_id = ${user.id}` : sql``}
        GROUP BY DATE(created_at)
        ORDER BY timestamp ASC
      `),
    ]);

    // Build status counts
    const statusMap: Record<string, number> = {};
    let totalActions = 0;
    actionStatusCounts.forEach((c) => {
      statusMap[c.status] = Number(c.statusCount);
      totalActions += Number(c.statusCount);
    });

    const totalConversations = Number(totalConversationsResult[0]?.value ?? 0);
    const activeConversations = Number(activeConversationsResult[0]?.value ?? 0);

    // Build agent maps
    const actionsByAgentMap: Record<string, number> = {};
    actionsByAgent.forEach((a) => {
      actionsByAgentMap[a.agentName] = Number(a.agentCount);
    });

    const conversationsByAgentMap: Record<string, number> = {};
    conversationsByAgent.forEach((c) => {
      if (c.agentType) {
        conversationsByAgentMap[c.agentType] = Number(c.agentTypeCount);
      }
    });

    const agg = conversationAggregates[0];

    return NextResponse.json({
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
