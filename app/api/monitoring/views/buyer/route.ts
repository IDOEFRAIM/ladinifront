// app/api/monitoring/views/buyer/route.ts
// =========================================================
// VUE ACHETEUR — Conversations et commandes agents
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const user: any = { id: ctx.userId, role: ctx.role };

  try {
    const [
      conversations,
      agentOrders,
      waitingForInput,
    ] = await Promise.all([
      // Historique des conversations
      db.query.conversations.findMany({
        where: eq(schema.conversations.userId, user.id),
        orderBy: (t, ops) => [ops.desc(t.createdAt)],
        limit: 20,
        with: {
          zone: { columns: { id: true, name: true, code: true } },
        },
      }),

      // Commandes initiées par un agent
      db.query.agentActions.findMany({
        where: and(
          eq(schema.agentActions.userId, user.id),
          inArray(schema.agentActions.actionType, ['PURCHASE', 'ORDER_CREATED']),
        ),
        orderBy: (t, ops) => [ops.desc(t.createdAt)],
        limit: 10,
        with: {
          order: {
            columns: { id: true, totalAmount: true, status: true, customerName: true },
          },
        },
      }),

      // Conversations en attente d'input
      db.query.conversations.findMany({
        where: and(
          eq(schema.conversations.userId, user.id),
          eq(schema.conversations.isWaitingForInput, true),
        ),
        orderBy: (t, ops) => [ops.desc(t.createdAt)],
        limit: 5,
      }),
    ]);

    return NextResponse.json({
      conversations,
      agentOrders,
      waitingForInput,
    });
  } catch (err) {
    console.error('[API] /monitoring/views/buyer error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la vue acheteur.' },
      { status: 500 }
    );
  }
}
