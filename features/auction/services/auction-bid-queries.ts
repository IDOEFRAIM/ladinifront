import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function getBidsForAuction(auctionId: string) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, auctionId),
      columns: { id: true, buyerId: true, status: true, maxPricePerUnit: true },
    });
    if (!auction) return { success: false, error: 'Enchère introuvable' };

    // Check access: only auction creator, admin, or bid participants
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, role: true } });
    const isOwner = auction.buyerId === userId;
    const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

    const bidsResult = await db.query.bids.findMany({
      where: eq(schema.bids.auctionId, auctionId),
      orderBy: [asc(schema.bids.offeredPrice)],
      with: {
        producer: {
          columns: { id: true, businessName: true, zoneId: true },
          with: { user: { columns: { id: true, name: true } } },
        },
      },
    });

    // Determine best bid (lowest price = best for buyer)
    const bestBidId = bidsResult.length > 0 ? bidsResult[0].id : null;

    const bids = bidsResult.map((b, idx) => ({
      id: b.id,
      producerId: b.producerId,
      producerName: isOwner || isAdmin ? (b.producer?.user?.name ?? b.producer?.businessName ?? 'Producteur') : `Producteur #${idx + 1}`,
      offeredPrice: b.offeredPrice,
      message: b.message,
      status: b.status,
      isWinner: b.isWinner,
      isBestBid: b.id === bestBidId,
      linkedStockId: b.linkedStockId,
      estimatedDeliveryDate: b.estimatedDeliveryDate ?? null,
      createdAt: b.createdAt,
    }));

    return {
      success: true,
      data: {
        auctionId,
        auctionStatus: auction.status,
        totalBids: bids.length,
        bestBidPrice: bidsResult[0]?.offeredPrice ?? null,
        bids,
      },
    };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getBidsForAuction error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// ── Annulation d'une enchère ──────────────────────────────────────────

export async function getMyBids() {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    const results = await db.query.bids.findMany({
      where: eq(schema.bids.producerId, producer.id),
      orderBy: [desc(schema.bids.createdAt)],
      with: {
        auction: {
          columns: { id: true, status: true, quantity: true, unit: true, maxPricePerUnit: true, deadline: true, subCategoryId: true },
          with: { subCategory: { columns: { id: true, name: true } } },
        },
      },
    });

    return {
      success: true,
      data: results.map(b => ({
        id: b.id,
        auctionId: b.auctionId,
        offeredPrice: b.offeredPrice,
        status: b.status,
        isWinner: b.isWinner,
        message: b.message,
        notifiedAt: b.notifiedAt,
        auctionStatus: b.auction?.status,
        subCategoryName: b.auction?.subCategory?.name ?? 'Produit',
        auctionQuantity: b.auction?.quantity,
        auctionUnit: b.auction?.unit,
        auctionDeadline: b.auction?.deadline,
        createdAt: b.createdAt,
      })),
    };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getMyBids error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// Récupère une enchère par id
