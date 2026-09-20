import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function submitBid(input: {
  auctionId: string;
  offeredPrice: number;
  linkedStockId?: string | null;
  message?: string | null;
  estimatedDeliveryDate?: string | null;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId) });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    // Use a transaction to safely apply anti-snipe + bid upsert.
    return await db.transaction(async (tx) => {
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction || auction.status !== 'OPEN') {
        return { success: false, error: 'Enchère fermée ou introuvable' };
      }

      // Self-bid guard: le buyer (créateur) ne peut pas enchérir sur sa propre enchère
      if (auction.buyerId === userId) {
        return { success: false, error: 'Vous ne pouvez pas enchérir sur votre propre enchère' };
      }

      const now = new Date();
      if (now > auction.deadline) {
        return { success: false, error: 'Délai dépassé' };
      }

    if (input.offeredPrice <= 0) {
      return { success: false, error: 'Le prix doit être supérieur à 0' };
    }

    if (input.offeredPrice > Number(auction.maxPricePerUnit)) {
      return { success: false, error: `Le prix ne peut dépasser le plafond de ${auction.maxPricePerUnit}` };
    }

      const est = input.estimatedDeliveryDate ? new Date(input.estimatedDeliveryDate) : null;
      if (input.estimatedDeliveryDate && (!est || isNaN(est.getTime()))) {
        return { success: false, error: 'Date estimée de livraison invalide' };
      }

      // Optional stock linkage validation
      const linkedStockId = input.linkedStockId ?? null;
      if (linkedStockId) {
        const stock = await tx.query.stocks.findFirst({
          where: eq(schema.stocks.id, linkedStockId),
          columns: { id: true },
        });
        if (!stock) return { success: false, error: 'Stock lié introuvable' };
      }

      // Anti-snipe: if bid is placed within last 2 minutes, extend deadline by 5 minutes.
      if (auction.autoExtend) {
        const msRemaining = auction.deadline.getTime() - now.getTime();
        if (msRemaining <= 2 * 60 * 1000) {
          const newDeadline = new Date(auction.deadline.getTime() + 5 * 60 * 1000);
          await tx
            .update(schema.auctions)
            .set({ deadline: newDeadline })
            .where(and(eq(schema.auctions.id, auction.id), eq(schema.auctions.deadline, auction.deadline)));
        }
      }

      const [bid] = await tx.insert(schema.bids)
        .values({
          auctionId: input.auctionId,
          producerId: producer.id,
          offeredPrice: String(input.offeredPrice),
          linkedStockId,
          message: input?.message ?? null,
          estimatedDeliveryDate: est,
        })
        .onConflictDoUpdate({
          target: [schema.bids.auctionId, schema.bids.producerId],
          set: {
            offeredPrice: String(input.offeredPrice),
            linkedStockId,
            message: input?.message ?? null,
            estimatedDeliveryDate: est,
          },
        })
        .returning();

      await audit({
        action: 'SUBMIT_BID',
        entityType: 'Bid',
        entityId: bid.id,
        actorId: userId,
        newValue: { auctionId: input.auctionId, offeredPrice: input.offeredPrice, linkedStockId },
      });

      return { success: true, data: bid };
    });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('submitBid error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

// ── Attribution sécurisée (Optimistic Locking) ───────────────────────────
//
// Problème : deux agents IA pourraient tenter d'attribuer la même enchère
// simultanément, provoquant un double `isWinner = true`.
//
// Solution : **Optimistic Concurrency Control** via un champ `version` sur Auction.
//
// Algorithme :
//   1. Lire l'auction + sa version courante.
//   2. Vérifier qu'elle est toujours OPEN.
//   3. Tenter un UPDATE atomique WHERE id = X AND version = V.
//   4. Si 0 lignes affectées → un autre agent a déjà attribué → abort.
//   5. Si 1 ligne affectée → marquer le bid gagnant dans la même transaction.
//
// Prisma ne supporte pas nativement `UPDATE … WHERE version = ?`, donc on
// utilise `$executeRaw` dans une transaction.
