import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';
import { BidPricingError, buildBidPricing, exceedsCeiling, toBidColumns, totalFor } from '@/features/auction/pricing/bid-pricing';

export interface SubmitBidInput {
  auctionId: string;
  /** Montant commercial (jamais un « prix par unité de l'enchère » implicite : voir `basis`). */
  amount: number;
  /** PER_BASE_UNIT | TOTAL_LOT — obligatoire : un bid neuf sans base est refusé. */
  basis: string;
  /** PER_BASE_UNIT uniquement : « TONNE » dans « 450000 / TONNE ». */
  priceUnit?: string | null;
  linkedStockId?: string | null;
  message?: string | null;
  estimatedDeliveryDate?: string | null;
}

/**
 * Soumet ou remplace l'offre du producteur (une offre par producteur et par enchère — `onConflictDoUpdate`).
 * Un nouveau bid, ou un bid modifié, écrit TOUJOURS sa base : `amount` seul (« 450000 ») n'est plus un bid valide
 * depuis B2c.1 — voir `buildBidPricing`. Changer la base (450000/TONNE -> 4 000 000 TOTAL_LOT) réécrit toutes les
 * colonnes de prix, jamais un mélange ancienne/nouvelle base.
 */
export async function submitBid(input: SubmitBidInput) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId) });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    return await db.transaction(async (tx) => {
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction || auction.status !== 'OPEN') {
        return { success: false, error: 'Enchère fermée ou introuvable' };
      }

      if (auction.buyerId === userId) {
        return { success: false, error: 'Vous ne pouvez pas enchérir sur votre propre enchère' };
      }

      const now = new Date();
      if (now > auction.deadline) {
        return { success: false, error: 'Délai dépassé' };
      }

      let pricing;
      try {
        pricing = buildBidPricing(
          { amount: input.amount, basis: input.basis, priceUnit: input.priceUnit },
          { quantity: auction.quantity, unit: auction.unit },
        );
      } catch (e) {
        if (e instanceof BidPricingError) return { success: false, code: e.code, error: e.message };
        throw e;
      }

      // Le plafond de l'acheteur est PAR unité de l'enchère : comparer le total comparable, jamais le montant brut.
      const total = totalFor(pricing, auction.quantity, auction.unit);
      if (exceedsCeiling(total, auction.maxPricePerUnit, auction.quantity)) {
        return { success: false, code: 'ceiling_exceeded', error: `Le total (${total.toPlain()} FCFA) dépasse le plafond de l'enchère.` };
      }

      const est = input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : null;
      if (input.estimatedDeliveryDate && (!est || isNaN(est.getTime()))) {
        return { success: false, error: 'Date estimée de livraison invalide' };
      }

      const linkedStockId = input.linkedStockId ?? null;
      if (linkedStockId) {
        const stock = await tx.query.stocks.findFirst({ where: eq(schema.stocks.id, linkedStockId), columns: { id: true } });
        if (!stock) return { success: false, error: 'Stock lié introuvable' };
      }

      if (auction.autoExtend) {
        const msRemaining = auction.deadline.getTime() - now.getTime();
        if (msRemaining <= 2 * 60 * 1000) {
          const newDeadline = new Date(auction.deadline.getTime() + 5 * 60 * 1000);
          await tx.update(schema.auctions)
            .set({ deadline: newDeadline })
            .where(and(eq(schema.auctions.id, auction.id), eq(schema.auctions.deadline, auction.deadline)));
        }
      }

      const cols = toBidColumns(pricing);
      const values = {
        auctionId: input.auctionId,
        producerId: producer.id,
        offeredPrice: cols.offeredPrice,
        offeredPriceBasis: cols.offeredPriceBasis,
        offeredPriceUnit: cols.offeredPriceUnit,
        offeredPriceCurrency: cols.offeredPriceCurrency,
        packageType: cols.packageType,
        packageContentAmount: cols.packageContentAmount,
        packageContentUnit: cols.packageContentUnit,
        normalizedUnitPrice: cols.normalizedUnitPrice,
        normalizedUnit: cols.normalizedUnit,
        pricingSnapshotVersion: cols.pricingSnapshotVersion,
        linkedStockId,
        message: input?.message ?? null,
        estimatedDeliveryDate: est,
      };

      const [bid] = await tx.insert(schema.bids)
        .values(values)
        .onConflictDoUpdate({ target: [schema.bids.auctionId, schema.bids.producerId], set: values })
        .returning();

      await audit({
        action: 'SUBMIT_BID',
        entityType: 'Bid',
        entityId: bid.id,
        actorId: userId,
        newValue: { auctionId: input.auctionId, offeredPrice: cols.offeredPrice, offeredPriceBasis: cols.offeredPriceBasis, linkedStockId },
      });

      return { success: true, data: bid };
    });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('submitBid error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}
