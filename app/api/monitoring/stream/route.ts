// app/api/monitoring/stream/route.ts
// =========================================================
// SSE ENDPOINT — Stream temps réel pour le monitoring
// Polling basé sur la DB toutes les 5s (scale: Redis pub/sub plus tard)
// =========================================================

import { NextRequest } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchStreamDeltas } from '@/app/actions/monitoring.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return new Response(JSON.stringify({ error: 'Non autorisé.' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const encoder = new TextEncoder();
  let isAborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (type: string, data: unknown) => {
        if (isAborted) return;
        try {
          const event = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        } catch {
          isAborted = true;
        }
      };

      sendEvent('heartbeat', { status: 'connected' });

      let lastCheckAt = new Date();

      const poll = async () => {
        if (isAborted) return;
        try {
          const deltas = await fetchStreamDeltas(ctx.userId, lastCheckAt);
          lastCheckAt = new Date();

          for (const action of deltas.newActions) sendEvent('agent:action:created', action);
          for (const action of deltas.updatedActions) {
            const type = action.status === 'APPROVED' ? 'agent:action:approved' : action.status === 'REJECTED' ? 'agent:action:rejected' : 'agent:action:updated';
            sendEvent(type, action);
          }
          for (const conv of deltas.newConversations) {
            const type = conv.isWaitingForInput ? 'conversation:waiting' : conv.response ? 'conversation:response' : 'conversation:new';
            sendEvent(type, conv);
          }

          sendEvent('heartbeat', { status: 'alive', pendingCount: deltas.newActions.filter((a) => a.status === 'PENDING').length });
        } catch (err) {
          console.error('[SSE] Poll error:', err);
        }
      };

      const interval = setInterval(poll, 5000);

      req.signal.addEventListener('abort', () => {
        isAborted = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
