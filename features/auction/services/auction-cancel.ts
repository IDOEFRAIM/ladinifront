import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function cancelAuction(input: {
  auctionId: string;
  reason?: string;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    return await db.transaction(async (tx) => {
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction) throw new Error('Enchère introuvable');
      if (auction.status !== 'OPEN') throw new Error('Seule une enchère OPEN peut être annulée');

      // Seul le créateur ou un admin
      const user = await tx.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, role: true } });
      const isOwner = auction.buyerId === userId;
      const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) throw new Error('Non autorisé');

      const updated = await tx.update(schema.auctions)
        .set({
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: input.reason ?? null,
          version: auction.version + 1,
        })
        .where(and(
          eq(schema.auctions.id, input.auctionId),
          eq(schema.auctions.version, auction.version),
          eq(schema.auctions.status, 'OPEN')
        ))
        .returning({ id: schema.auctions.id });

      if (updated.length === 0) throw new Error('Conflit de concurrence');

      // Mark all bids as LOST
      await tx.update(schema.bids)
        .set({ status: 'LOST', notifiedAt: new Date() })
        .where(eq(schema.bids.auctionId, input.auctionId));

      await audit({
        action: 'CANCEL_AUCTION',
        entityType: 'Auction',
        entityId: input.auctionId,
        actorId: userId,
        newValue: { reason: input.reason, status: 'CANCELLED' },
      });

      return { success: true, data: { auctionId: input.auctionId, status: 'CANCELLED' } };
    });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('cancelAuction error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

// ── Mes enchères (pour le buyer) ──────────────────────────────────────
