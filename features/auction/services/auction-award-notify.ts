import { inArray } from 'drizzle-orm';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

/**
 * Notifications d'issue d'attribution — envoyées APRÈS le commit (jamais depuis la transaction : un rollback ne doit
 * pas laisser derrière lui un « vous avez gagné » déjà parti). Non bloquant.
 */
export async function notifyAwardOutcome(args: {
  auctionId: string;
  winnerProducerId: string | null;
  loserProducerIds: string[];
}): Promise<void> {
  try {
    const { sendUserNotification } = await import('@/features/notifications/services/notification.service');
    const ids = Array.from(new Set([...(args.winnerProducerId ? [args.winnerProducerId] : []), ...args.loserProducerIds]));
    if (ids.length === 0) return;
    const producers = await db.query.producers.findMany({
      where: inArray(schema.producers.id, ids),
      columns: { id: true, userId: true },
    });
    const userOf = new Map<string, string>();
    for (const p of producers) if (p.userId) userOf.set(p.id, p.userId);
    if (args.winnerProducerId && userOf.has(args.winnerProducerId)) {
      await sendUserNotification(userOf.get(args.winnerProducerId) as string, 'AUCTION_WON', { auctionId: args.auctionId });
    }
    for (const pid of args.loserProducerIds) {
      const uid = userOf.get(pid);
      if (uid) await sendUserNotification(uid, 'AUCTION_LOST', { auctionId: args.auctionId });
    }
  } catch (err) {
    console.warn('notifyAwardOutcome: notification failed (non-blocking)', err);
  }
}
