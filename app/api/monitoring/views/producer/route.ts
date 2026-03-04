// app/api/monitoring/views/producer/route.ts
// =========================================================
// VUE PRODUCTEUR — Actions et conversations liées
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, avg } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await requireProducer(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const [
      myActions,
      myConversations,
      agentSuggestions,
      totalInteractionsResult,
      avgResponseTimeResult,
    ] = await Promise.all([
      // Dernières actions liées à ce user
      db.query.agentActions.findMany({
        where: eq(schema.agentActions.userId, user.id),
        orderBy: (t, { desc: d }) => [d(t.createdAt)],
        limit: 20,
        with: {
          order: {
            columns: { id: true, totalAmount: true, status: true, customerName: true },
          },
        },
      }),

      // Dernières conversations
      db.query.conversations.findMany({
        where: eq(schema.conversations.userId, user.id),
        orderBy: (t, { desc: d }) => [d(t.createdAt)],
        limit: 15,
        with: {
          zone: { columns: { id: true, name: true, code: true } },
        },
      }),

      // Suggestions d'agents en attente
      db.query.agentActions.findMany({
        where: eq(schema.agentActions.userId, user.id),
        orderBy: (t, { desc: d }) => [d(t.priority)],
        limit: 10,
      }),

      // Total interactions
      db.select({ value: count() }).from(schema.conversations).where(eq(schema.conversations.userId, user.id)),

      // Temps de réponse moyen
      db.select({ avgMs: avg(schema.conversations.responseTimeMs) }).from(schema.conversations).where(eq(schema.conversations.userId, user.id)),
    ]);

    // Déterminer l'agent le plus utilisé
    const agentUsage = myConversations.reduce<Record<string, number>>((acc, c) => {
      if (c.agentType) {
        acc[c.agentType] = (acc[c.agentType] || 0) + 1;
      }
      return acc;
    }, {});

    const topAgentUsed = Object.entries(agentUsage)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return NextResponse.json({
      myActions,
      myConversations,
      agentSuggestions,
      performanceMetrics: {
        totalInteractions: Number(totalInteractionsResult[0]?.value ?? 0),
        avgResponseTime: Math.round(Number(avgResponseTimeResult[0]?.avgMs) || 0),
        topAgentUsed,
      },
    });
  } catch (err) {
    console.error('[API] /monitoring/views/producer error:', err);
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la vue producteur.' },
      { status: 500 }
    );
  }
}
