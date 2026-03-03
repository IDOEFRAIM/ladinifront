// app/api/monitoring/stream/route.ts
// =========================================================
// SSE ENDPOINT — Stream temps réel pour le monitoring
// Polling basé sur la DB toutes les 5s (scale: Redis pub/sub plus tard)
// =========================================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) {
    if (error) return error;
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Envoi du heartbeat initial
      const sendEvent = (type: string, data: unknown) => {
        if (isAborted) return;
        try {
          const event = JSON.stringify({
            type,
            data,
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {
          // Stream fermé
          isAborted = true;
        }
      };

      // Heartbeat
      sendEvent('heartbeat', { status: 'connected' });

      // Track last check time
      let lastCheckAt = new Date();

      // Poll interval (5s pour le prototype, Redis pour la production)
      const poll = async () => {
        if (isAborted) return;

        try {
          const canViewActionsAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
          const canViewConversationsAll = await userHasPermission(user.id, 'CONVERSATION_VIEW_ALL');
          const scope = canViewActionsAll ? {} : { userId: user.id };

          // Nouvelles actions depuis le dernier check
          const newActions = await prisma.agentAction.findMany({
            where: {
              ...scope,
              createdAt: { gt: lastCheckAt },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
          });

          // Nouvelles conversations
          const newConversations = await prisma.conversation.findMany({
            where: {
              ...(canViewConversationsAll ? {} : { userId: user.id }),
              createdAt: { gt: lastCheckAt },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

          // Actions mises à jour (approuvées/rejetées)
          const updatedActions = await prisma.agentAction.findMany({
            where: {
              ...scope,
              updatedAt: { gt: lastCheckAt },
              createdAt: { lt: lastCheckAt }, // Pas les nouvelles
            },
            take: 10,
          });

          lastCheckAt = new Date();

          // Émettre les événements
          for (const action of newActions) {
            sendEvent('agent:action:created', action);
          }
          for (const action of updatedActions) {
            const type =
              action.status === 'APPROVED'
                ? 'agent:action:approved'
                : action.status === 'REJECTED'
                ? 'agent:action:rejected'
                : 'agent:action:updated';
            sendEvent(type, action);
          }
          for (const conv of newConversations) {
            const type = conv.isWaitingForInput
              ? 'conversation:waiting'
              : conv.response
              ? 'conversation:response'
              : 'conversation:new';
            sendEvent(type, conv);
          }

          // Heartbeat périodique
          sendEvent('heartbeat', {
            status: 'alive',
            pendingCount: newActions.filter((a) => a.status === 'PENDING').length,
          });
        } catch (err) {
          console.error('[SSE] Poll error:', err);
        }
      };

      const interval = setInterval(poll, 5000);

      // Cleanup quand le client se déconnecte
      req.signal.addEventListener('abort', () => {
        isAborted = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx
    },
  });
}
