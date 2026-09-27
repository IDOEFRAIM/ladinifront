import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function awardAuction(input: {
  auctionId: string;
  winnerBidId: string;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    return await db.transaction(async (tx) => {
      // 1. Lire l'enchère
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction) throw new Error('Enchère introuvable');
      if (auction.status !== 'OPEN') throw new Error('Enchère déjà attribuée ou fermée');

      // Seul le créateur (buyer) ou un admin peut attribuer
      const user = await tx.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, role: true } });
      const isOwner = auction.buyerId === userId;
      const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) throw new Error('Seul le créateur ou un admin peut attribuer cette enchère');

      // Vérifier que le bid appartient bien à cette enchère
      const winnerBid = await tx.query.bids.findFirst({ where: and(eq(schema.bids.id, input.winnerBidId), eq(schema.bids.auctionId, input.auctionId)) });
      if (!winnerBid) throw new Error('Bid introuvable pour cette enchère');

      // 2. Optimistic lock: set AWARDED + winnerBidId + awardedAt
      const updated = await tx.update(schema.auctions)
        .set({
          status: 'AWARDED',
          winnerBidId: input.winnerBidId,
          awardedAt: new Date(),
          version: auction.version + 1,
        })
        .where(
          and(
            eq(schema.auctions.id, input.auctionId),
            eq(schema.auctions.version, auction.version),
            eq(schema.auctions.status, 'OPEN')
          )
        )
        .returning({ id: schema.auctions.id });

      if (updated.length === 0) {
        throw new Error('Conflit de concurrence : l\'enchère a été modifiée. Réessayez.');
      }

      // 3. Marquer le bid gagnant + tous les perdants
      await tx.update(schema.bids)
        .set({ isWinner: true, status: 'WINNER', notifiedAt: new Date() })
        .where(eq(schema.bids.id, input.winnerBidId));

      await tx.update(schema.bids)
        .set({ status: 'LOST', notifiedAt: new Date() })
        .where(and(
          eq(schema.bids.auctionId, input.auctionId),
          ne(schema.bids.id, input.winnerBidId)
        ));

      // 3b. Générer automatiquement une commande liée à l'enchère (idempotent)
      const existingOrder = await tx.query.orders.findFirst({
        where: eq(schema.orders.auctionId, input.auctionId),
        columns: { id: true },
      });

      if (!existingOrder) {
        const winnerBid = await tx.query.bids.findFirst({
          where: eq(schema.bids.id, input.winnerBidId),
          columns: { id: true, offeredPrice: true, linkedStockId: true },
        });

        // Resolve / create buyer profile from auction.buyerId (auth.users.id)
        let buyerProfile = await tx.query.buyerProfiles.findFirst({
          where: eq(schema.buyerProfiles.userId, auction.buyerId),
          columns: { id: true },
        });
        if (!buyerProfile) {
          const [createdProfile] = await tx
            .insert(schema.buyerProfiles)
            .values({
              userId: auction.buyerId,
              buyerTypeId: null,
              establishmentName: null,
              defaultDeliveryAddress: null,
              isVerified: false,
            })
            .returning({ id: schema.buyerProfiles.id });
          buyerProfile = createdProfile ?? null;
        }

        const buyerUser = await tx.query.users.findFirst({
          where: eq(schema.users.id, auction.buyerId),
          columns: { name: true, phone: true },
        });

        const totalAmount = winnerBid ? Number(winnerBid.offeredPrice) * Number(auction.quantity) : 0;

        await tx.insert(schema.orders).values({
          buyerId: buyerProfile?.id ?? null,
          customerName: buyerUser?.name ?? null,
          customerPhone: buyerUser?.phone ?? null,
          totalAmount: String(totalAmount),
          source: 'AUCTION',
          status: 'PENDING',
          deliveryStatus: 'PENDING',
          zoneId: auction.targetZoneId ?? null,
          auctionId: auction.id,
          winningBidId: input.winnerBidId,
        });

        // LOCK STOCK — Déduire immédiatement la quantité du stock lié
        if (winnerBid?.linkedStockId) {
          const stock = await tx.query.stocks.findFirst({
            where: eq(schema.stocks.id, winnerBid.linkedStockId),
            columns: { id: true, quantity: true },
          });
          if (stock && Number(stock.quantity) >= Number(auction.quantity)) {
            await tx.update(schema.stocks)
              .set({ quantity: sql`${schema.stocks.quantity} - ${auction.quantity}` })
              .where(eq(schema.stocks.id, winnerBid.linkedStockId));
            await tx.insert(schema.stockMovements).values({
              stockId: winnerBid.linkedStockId,
              type: 'SALE',
              quantity: String(-Number(auction.quantity)),
              reason: `Enchère #${auction.id.slice(0, 8)} — Attribution manuelle`,
            });
          }
        }
      }

      // 4. Notifier les perdants (logiquement via notification service)
      try {
        const { sendUserNotification } = await import('@/features/notifications/services/notification.service');
        const loserBids = await tx.query.bids.findMany({
          where: and(eq(schema.bids.auctionId, input.auctionId), ne(schema.bids.id, input.winnerBidId)),
          with: { producer: { with: { user: { columns: { id: true, name: true, phone: true } } } } },
        });
        for (const lb of loserBids) {
          if (lb.producer?.user) {
            await sendUserNotification(lb.producer.user.id, 'AUCTION_LOST', { auctionId: input.auctionId });
          }
        }
        // Notify winner
        if (winnerBid.producerId) {
          const wp = await tx.query.producers.findFirst({ where: eq(schema.producers.id, winnerBid.producerId), with: { user: { columns: { id: true, name: true, phone: true } } } });
          if (wp?.user) {
            await sendUserNotification(wp.user.id, 'AUCTION_WON', { auctionId: input.auctionId });
          }
        }
      } catch (notifErr) {
        console.warn('awardAuction: notification failed (non-blocking)', notifErr);
      }

      // 5. Audit
      await audit({
        action: 'AWARD_AUCTION',
        entityType: 'Auction',
        entityId: input.auctionId,
        actorId: userId,
        newValue: { winnerBidId: input.winnerBidId, status: 'AWARDED', version: auction.version + 1 },
      });

      return {
        success: true,
        data: { auctionId: input.auctionId, winnerBidId: input.winnerBidId, status: 'AWARDED' },
      };
    });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('awardAuction error:', e);
    return { success: false, error: e.message || 'Erreur de concurrence' };
  }
}

// ── Liste des bids pour une enchère (visible par le créateur) ──────────
