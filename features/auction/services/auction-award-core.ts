/**
 * Noyau UNIQUE d'attribution d'une enchère côté web (Phase B2c.1).
 *
 * Les deux chemins qui désignent un gagnant — l'attribution manuelle par l'acheteur (`awardAuction`) et le
 * règlement automatique à l'échéance (`settleExpiredAuctions`) — passent ICI. Ni l'un ni l'autre ne calcule un
 * total à partir de `offeredPrice × quantité` : le total, l'empreinte et l'instantané gelé viennent de la
 * `CertifiedAwardDecision` (voir `pricing/award-decision.ts`, en parité avec le backend Python).
 *
 * Invariants :
 *   - toute la mutation (enchère, offres, commande, stock) est UNE transaction : tout ou rien ;
 *   - verrou optimiste sur `auctions.version` : deux attributions concurrentes ne créent jamais deux commandes
 *     (l'index unique `orders_auction_unique` est la dernière défense) ;
 *   - pas de `order_items` pour une commande d'appel d'offres (contrat B2a : l'instantané vit sur
 *     `orders.award_pricing_snapshot`, gelé par trigger).
 */
import { eq, and, ne, sql } from 'drizzle-orm';
import * as schema from '@/src/db/schema';
import type { db } from '@/src/db';
import { frozenSnapshotOf, fingerprintOf, type CertifiedAwardDecision } from '@/features/auction/pricing/award-decision';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** L'enchère n'est plus dans l'état lu (attribuée / modifiée / commande déjà présente) : rien n'a été écrit. */
export class AwardConflict extends Error {
  constructor(readonly code: 'concurrent_update' | 'order_exists', message: string) {
    super(message);
    this.name = 'AwardConflict';
  }
}

export interface AuctionRow {
  id: string;
  buyerId: string;
  quantity: string;
  unit: string;
  status: string;
  version: number;
  targetZoneId: string | null;
}

export interface CloseArgs {
  auction: AuctionRow;
  winnerBid: { id: string; producerId: string; linkedStockId: string | null };
  decision: CertifiedAwardDecision;
  /** statut final de l'enchère : 'AWARDED' (manuel) ou 'CLOSED' (règlement automatique) — inchangés par B2c.1. */
  finalStatus: 'AWARDED' | 'CLOSED';
  stockReason: string;
}

export interface CloseResult {
  orderId: string;
  totalAmount: string;
  fingerprint: string;
  loserProducerIds: string[];
}

export async function closeAuctionOnBid(tx: Tx, args: CloseArgs): Promise<CloseResult> {
  const { auction, winnerBid, decision } = args;
  const now = new Date();

  // 1. Verrou optimiste : l'enchère doit encore être OPEN à la version lue.
  const updated = await tx.update(schema.auctions)
    .set({ status: args.finalStatus, winnerBidId: winnerBid.id, awardedAt: now, version: auction.version + 1 })
    .where(and(
      eq(schema.auctions.id, auction.id),
      eq(schema.auctions.version, auction.version),
      eq(schema.auctions.status, 'OPEN'),
    ))
    .returning({ id: schema.auctions.id });
  if (updated.length === 0) {
    throw new AwardConflict('concurrent_update', 'Conflit de concurrence : l\'enchère a été modifiée. Réessayez.');
  }

  // 2. Offre gagnante + offres perdantes (une offre retirée n'est jamais « perdante »).
  await tx.update(schema.bids)
    .set({ isWinner: true, status: 'WINNER', notifiedAt: now })
    .where(eq(schema.bids.id, winnerBid.id));
  const losers = await tx.update(schema.bids)
    .set({ status: 'LOST', notifiedAt: now })
    .where(and(
      eq(schema.bids.auctionId, auction.id),
      ne(schema.bids.id, winnerBid.id),
      ne(schema.bids.status, 'WITHDRAWN'),
    ))
    .returning({ producerId: schema.bids.producerId });

  // 3. Commande : total ET instantané viennent de la décision certifiée.
  const existing = await tx.query.orders.findFirst({ where: eq(schema.orders.auctionId, auction.id), columns: { id: true } });
  if (existing) throw new AwardConflict('order_exists', 'Une commande existe déjà pour cette enchère.');

  let buyerProfile = await tx.query.buyerProfiles.findFirst({ where: eq(schema.buyerProfiles.id, auction.buyerId), columns: { id: true, userId: true } });
  if (!buyerProfile) {
    // Enchère historique dont buyerId est un identifiant utilisateur : on résout/crée le profil de cet utilisateur.
    buyerProfile = await tx.query.buyerProfiles.findFirst({ where: eq(schema.buyerProfiles.userId, auction.buyerId), columns: { id: true, userId: true } });
    if (!buyerProfile) {
      const [created] = await tx.insert(schema.buyerProfiles)
        .values({ userId: auction.buyerId, buyerTypeId: null, establishmentName: null, defaultDeliveryAddress: null, isVerified: false })
        .returning({ id: schema.buyerProfiles.id, userId: schema.buyerProfiles.userId });
      buyerProfile = created;
    }
  }
  const buyerUser = buyerProfile?.userId
    ? await tx.query.users.findFirst({ where: eq(schema.users.id, buyerProfile.userId), columns: { name: true, phone: true } })
    : null;

  const totalAmount = decision.awardTotal.toFixed();
  const [order] = await tx.insert(schema.orders).values({
    buyerId: buyerProfile?.id ?? null,
    customerName: buyerUser?.name ?? null,
    customerPhone: buyerUser?.phone ?? null,
    totalAmount,
    source: 'AUCTION',
    status: 'PENDING',
    deliveryStatus: 'PENDING',
    zoneId: auction.targetZoneId ?? null,
    auctionId: auction.id,
    winningBidId: winnerBid.id,
    awardPricingSnapshot: frozenSnapshotOf(decision),
  }).returning({ id: schema.orders.id });

  // 4. Verrou de stock (inchangé fonctionnellement ; comparaison NUMÉRIQUE — `numeric` revient en chaîne).
  if (winnerBid.linkedStockId) {
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
        reason: `Enchère #${auction.id.slice(0, 8)} — ${args.stockReason}`,
      });
    }
  }

  return {
    orderId: order.id,
    totalAmount,
    fingerprint: fingerprintOf(decision),
    loserProducerIds: Array.from(new Set(losers.map((l) => l.producerId).filter(Boolean))) as string[],
  };
}
