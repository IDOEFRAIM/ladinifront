import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getProfileIdOrThrow } from '@/features/buyer/services/buyer-shared';

/**
 * Historique des enchères de l'acheteur (gagnées / perdues / en cours).
 */
export async function getBuyerAuctionHistory(userId: string) {
  if (!userId) return { active: [], won: [], lost: [] };

  const allAuctions = await db.query.auctions.findMany({
    // IMPORTANT: auctions.buyerId references users.id (not buyer_profiles.id)
    where: eq(schema.auctions.buyerId, userId),
    orderBy: [desc(schema.auctions.createdAt)],
    with: {
      subCategory: { columns: { id: true, name: true } },
      bids: {
        columns: { id: true, offeredPrice: true, isWinner: true, producerId: true },
      },
      targetZone: { columns: { id: true, name: true } },
    },
  });

  const active = allAuctions.filter(a => a.status === 'OPEN');
  const won = allAuctions.filter(a => a.status === 'CLOSED' && a.bids.some(b => b.isWinner));
  const lost = allAuctions.filter(a => a.status === 'CLOSED' && !a.bids.some(b => b.isWinner));

  return { active, won, lost };
}

export async function getBuyerBillingSummary(userId: string) {
  const profileId = await getProfileIdOrThrow(userId);
  if (!profileId) {
    return {
      currency: 'XOF',
      monthTotal: 0,
      pendingTotal: 0,
      paidTotal: 0,
      invoiceCount: 0,
    };
  }

  const orders = await db.query.orders.findMany({
    where: eq(schema.orders.buyerId, profileId),
    columns: {
      id: true,
      totalAmount: true,
      currency: true,
      paymentStatus: true,
      createdAt: true,
    },
    orderBy: [desc(schema.orders.createdAt)],
    limit: 200,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthOrders = orders.filter((order) => order.createdAt >= monthStart);

  return {
    currency: 'XOF',
    monthTotal: monthOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    pendingTotal: orders
      .filter((order) => String(order.paymentStatus).toUpperCase() !== 'PAID')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    paidTotal: orders
      .filter((order) => String(order.paymentStatus).toUpperCase() === 'PAID')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    invoiceCount: orders.length,
  };
}
