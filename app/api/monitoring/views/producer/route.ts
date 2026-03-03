// app/api/monitoring/views/producer/route.ts
// =========================================================
// VUE PRODUCTEUR — Actions et conversations liées
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
      totalInteractions,
      avgResponseTime,
    ] = await Promise.all([
      // Dernières actions liées à ce user
      prisma.agentAction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          order: {
            select: { id: true, totalAmount: true, status: true, customerName: true },
          },
        },
      }),

      // Dernières conversations
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          zone: { select: { id: true, name: true, code: true } },
        },
      }),

      // Suggestions d'agents en attente
      prisma.agentAction.findMany({
        where: {
          userId: user.id,
          status: 'PENDING',
        },
        orderBy: { priority: 'desc' },
        take: 10,
      }),

      // Total interactions
      prisma.conversation.count({
        where: { userId: user.id },
      }),

      // Temps de réponse moyen
      prisma.conversation.aggregate({
        where: { userId: user.id },
        _avg: { responseTimeMs: true },
      }),
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
        totalInteractions,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
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
