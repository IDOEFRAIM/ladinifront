import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, ilike, count, gt, lt, desc } from 'drizzle-orm';
import { userHasPermission } from '@/features/organization/services/role.service';

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
    const term = `%${filters.search}%`;
    conditions.push(ilike(schema.conversations.agentType, term));
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
    : gt(schema.agentActions.createdAt, since);
  const newActions = await db.query.agentActions.findMany({
    where: newActionsWhere,
    orderBy: (t, ops) => [ops.desc(t.createdAt)],
    limit: 10,
    with: { user: { columns: { id: true, name: true, role: true } } },
  });

  const convWhere = canViewConversationsAll
    ? gt(schema.conversations.createdAt, since)
    : and(eq(schema.conversations.userId, userId), gt(schema.conversations.createdAt, since));
  const newConversations = await db.query.conversations.findMany({ where: convWhere, orderBy: (t, ops) => [ops.desc(t.createdAt)], limit: 10 });

  const updatedWhere = scope.userId
    ? and(eq(schema.agentActions.userId, scope.userId), gt(schema.agentActions.updatedAt, since), lt(schema.agentActions.createdAt, since))
    : and(gt(schema.agentActions.updatedAt, since), lt(schema.agentActions.createdAt, since));
  const updatedActions = await db.query.agentActions.findMany({ where: updatedWhere, limit: 10 });

  return { newActions, newConversations, updatedActions };
}
