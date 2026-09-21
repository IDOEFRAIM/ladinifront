import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { acquireStream, fetchLiveSummary, fetchNewTurns, releaseStream } from '@/features/monitoring/cockpit/stream';
import { fetchHealth } from '@/features/monitoring/cockpit/health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const POLL_MS = 5000;
const HEALTH_EVERY_TICKS = 6; // 30 s

/**
 * Flux temps réel du cockpit (SSE) : nouveaux tours, compteurs glissants 5 min, changements d'état de santé.
 * Coût par connexion et par tick de 5 s : 2 requêtes indexées bornées (≤ 50 lignes / 1 agrégat sur 5 min) ;
 * la santé (6 requêtes) n'est recalculée que toutes les 30 s. Connexions plafonnées (MAX_STREAMS).
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  if (!acquireStream()) return new Response(JSON.stringify({ error: 'Trop de connexions temps réel ouvertes.' }), { status: 429, headers: { 'content-type': 'application/json' } });

  const enc = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify({ type, data, at: new Date().toISOString() })}\n\n`)); } catch { close(); }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        releaseStream();
        try { controller.close(); } catch { /* déjà fermé */ }
      };
      req.signal.addEventListener('abort', close);

      send('hello', { pollMs: POLL_MS });
      let cursor = new Date(Date.now() - 60_000); // les dernières minutes au 1er tick
      let lastOverall: string | null = null;
      let tick = 0;
      let busy = false;

      const poll = async () => {
        if (closed || busy) return; // jamais deux polls concurrents sur une connexion lente
        busy = true;
        try {
          const [{ turns, cursor: next }, summary] = await Promise.all([fetchNewTurns(cursor), fetchLiveSummary()]);
          cursor = next;
          if (turns.length) send('turns', turns);
          send('summary', summary);
          if (tick % HEALTH_EVERY_TICKS === 0) {
            const h = await fetchHealth(15);
            if (lastOverall && lastOverall !== h.overall) send('health', { from: lastOverall, to: h.overall });
            lastOverall = h.overall;
          }
          tick++;
        } catch (e) {
          console.error('[monitoring/stream] poll', e);
          send('error', { message: 'lecture temporairement indisponible' });
        } finally {
          busy = false;
        }
      };
      await poll();
      timer = setInterval(poll, POLL_MS);
    },
    cancel() {
      if (!closed) { closed = true; if (timer) clearInterval(timer); releaseStream(); }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
