import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte, lte, or, ilike, count, desc, inArray } from 'drizzle-orm';
import { userHasPermission } from '@/features/organization/services/role.service';

export type FetchAgentActionsOpts = {
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
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(schema.agentActions.agentName, term),
        ilike(schema.agentActions.actionType, term),
        ilike(schema.agentActions.aiReasoning, term),
      ),
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
