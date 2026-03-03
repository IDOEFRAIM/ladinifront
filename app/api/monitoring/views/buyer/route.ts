// app/api/monitoring/views/buyer/route.ts
// =========================================================
// VUE ACHETEUR — Conversations et commandes agents
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const [
      conversations,
      agentOrders,
      waitingForInput,
    ] = await Promise.all([
      // Historique des conversations
      prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          zone: { select: { id: true, name: true, code: true } },
        },
      }),

      // Commandes initiées par un agent
      prisma.agentAction.findMany({
        where: {
          userId: user.id,
          actionType: { in: ['PURCHASE', 'ORDER_CREATED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          order: {
            select: { id: true, totalAmount: true, status: true, customerName: true },
          },
        },
      }),

      // Conversations en attente d'input
      prisma.conversation.findMany({
        where: {
          userId: user.id,
          isWaitingForInput: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
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
