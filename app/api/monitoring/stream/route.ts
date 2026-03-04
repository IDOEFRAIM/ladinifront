// app/api/monitoring/stream/route.ts
// =========================================================
// SSE ENDPOINT — Stream temps réel pour le monitoring
// Polling basé sur la DB toutes les 5s (scale: Redis pub/sub plus tard)
// =========================================================

import { NextRequest } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const user: any = { id: ctx.userId, role: ctx.role };
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
          const newActionsWhere = scope.userId
            ? and(eq(schema.agentActions.userId, scope.userId), gt(schema.agentActions.createdAt, lastCheckAt))
            : gt(schema.agentActions.createdAt, lastCheckAt);
          const newActions = await db.query.agentActions.findMany({
            where: newActionsWhere,
            orderBy: (t, ops) => [ops.desc(t.createdAt)],
            limit: 10,
            with: {
              user: { columns: { id: true, name: true, role: true } },
            },
          });

          // Nouvelles conversations
          const convWhere = canViewConversationsAll
            ? gt(schema.conversations.createdAt, lastCheckAt)
            : and(eq(schema.conversations.userId, user.id), gt(schema.conversations.createdAt, lastCheckAt));
          const newConversations = await db.query.conversations.findMany({
            where: convWhere,
            orderBy: (t, ops) => [ops.desc(t.createdAt)],
            limit: 10,
          });

          // Actions mises à jour (approuvées/rejetées)
          const updatedWhere = scope.userId
            ? and(eq(schema.agentActions.userId, scope.userId), gt(schema.agentActions.updatedAt, lastCheckAt), lt(schema.agentActions.createdAt, lastCheckAt))
            : and(gt(schema.agentActions.updatedAt, lastCheckAt), lt(schema.agentActions.createdAt, lastCheckAt));
          const updatedActions = await db.query.agentActions.findMany({
            where: updatedWhere,
            limit: 10,
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
