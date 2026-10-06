import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';
import { AwardNotPossible, BidPricingError, renderPricingLabel } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf } from '@/features/auction/pricing/award-decision';
import { AwardConflict, closeAuctionOnBid } from '@/features/auction/services/auction-award-core';
import { notifyAwardOutcome } from '@/features/auction/services/auction-award-notify';

/** Erreur métier avec un code stable (renvoyé tel quel à l'appelant). */
class AwardRefused extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

/**
 * Attribution d'une enchère à une offre (acheteur propriétaire ou admin).
 *
 * L'appelant fournit `expectedFingerprint` : l'empreinte des TERMES qu'il a vus et acceptés (producteur, prix + base,
 * quantité, total — voir `getBidsForAuction().bids[].award`). Elle est revalidée ici, dans la transaction, contre l'état
 * courant : si le producteur a modifié son offre entre l'affichage et le clic, l'attribution est REFUSÉE
 * (`award_terms_changed`), jamais exécutée sur d'anciens termes. Un bid dont la base de prix n'est pas certifiée
 * (antérieur à B2a) n'est pas attribuable (`bid_basis_unknown`) : on ne devine pas « par unité ».
 *
 * Idempotent : un second clic sur la même offre déjà attribuée renvoie le résultat existant (`idempotent: true`) sans
 * rien réécrire — une seule commande, un seul instantané.
 */
export async function awardAuction(input: {
  auctionId: string;
  winnerBidId: string;
  expectedFingerprint: string;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };
  if (!input.expectedFingerprint) {
    return { success: false, code: 'expected_terms_required', error: 'Les termes confirmés (empreinte) sont requis pour attribuer.' };
  }

  try {
    const outcome = await db.transaction(async (tx) => {
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction) throw new AwardRefused('auction_not_found', 'Enchère introuvable');

      // Propriétaire : `auctions.buyer_id` référence `buyer_profiles.id` ; on accepte aussi l'identifiant utilisateur
      // (enchères historiques créées par le web) — vérification transitoire, voir le doc B2c.1.
      const user = await tx.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, role: true } });
      const profile = await tx.query.buyerProfiles.findFirst({ where: eq(schema.buyerProfiles.userId, userId), columns: { id: true } });
      const isOwner = auction.buyerId === userId || (profile != null && auction.buyerId === profile.id);
      const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
      if (!isOwner && !isAdmin) throw new AwardRefused('forbidden', 'Seul le créateur ou un admin peut attribuer cette enchère');

      const bid = await tx.query.bids.findFirst({ where: and(eq(schema.bids.id, input.winnerBidId), eq(schema.bids.auctionId, input.auctionId)) });
      if (!bid) throw new AwardRefused('bid_not_found', 'Bid introuvable pour cette enchère');

      if (auction.status !== 'OPEN') {
        // Rejeu (double clic, redélivrance) : même enchère déjà attribuée à CE bid => résultat existant, aucune écriture.
        if (auction.status === 'AWARDED' && auction.winnerBidId === input.winnerBidId) {
          const order = await tx.query.orders.findFirst({ where: eq(schema.orders.auctionId, auction.id), columns: { id: true, totalAmount: true, awardPricingSnapshot: true } });
          if (order) {
            const award = ((order.awardPricingSnapshot ?? {}) as { award?: { fingerprint?: string } }).award;
            return { replay: true as const, orderId: order.id, totalAmount: String(order.totalAmount), fingerprint: award?.fingerprint ?? null, loserProducerIds: [] as string[], winnerProducerId: null as string | null, pricingLabel: null as string | null };
          }
        }
        throw new AwardRefused('auction_not_open', 'Enchère déjà attribuée ou fermée');
      }
      if (String(bid.status || '').toUpperCase() !== 'PENDING') {
        throw new AwardRefused('bid_not_selectable', 'Cette offre a été retirée ou n\'est plus disponible pour sélection.');
      }

      let decision;
      try {
        decision = buildAwardDecision(bid, { id: auction.id, buyerId: auction.buyerId, quantity: auction.quantity, unit: auction.unit });
      } catch (e) {
        if (e instanceof AwardNotPossible) throw new AwardRefused(e.code, e.message);
        throw e;
      }
      if (fingerprintOf(decision) !== input.expectedFingerprint) {
        throw new AwardRefused('award_terms_changed', 'Les termes de cette offre ont changé depuis votre confirmation (prix, base, quantité ou total). Consultez les offres à nouveau avant de retenir un gagnant.');
      }

      const closed = await closeAuctionOnBid(tx, {
        auction: { id: auction.id, buyerId: auction.buyerId, quantity: auction.quantity, unit: auction.unit, status: auction.status, version: auction.version, targetZoneId: auction.targetZoneId },
        winnerBid: { id: bid.id, producerId: bid.producerId, linkedStockId: bid.linkedStockId },
        decision,
        finalStatus: 'AWARDED',
        stockReason: 'Attribution manuelle',
      });
      return { replay: false as const, ...closed, winnerProducerId: bid.producerId, pricingLabel: renderPricingLabel(decision.pricing) };
    });

    if (!outcome.replay) {
      await notifyAwardOutcome({ auctionId: input.auctionId, winnerProducerId: outcome.winnerProducerId, loserProducerIds: outcome.loserProducerIds });
      await audit({
        action: 'AWARD_AUCTION',
        entityType: 'Auction',
        entityId: input.auctionId,
        actorId: userId,
        newValue: { winnerBidId: input.winnerBidId, status: 'AWARDED', orderId: outcome.orderId, totalAmount: outcome.totalAmount, fingerprint: outcome.fingerprint },
      });
    }

    return {
      success: true,
      data: {
        auctionId: input.auctionId,
        winnerBidId: input.winnerBidId,
        status: 'AWARDED',
        orderId: outcome.orderId,
        totalAmount: outcome.totalAmount,
        pricingLabel: outcome.pricingLabel,
        fingerprint: outcome.fingerprint,
        idempotent: outcome.replay,
      },
    };
  } catch (_e: unknown) {
    if (_e instanceof AwardRefused) return { success: false, code: _e.code, error: _e.message };
    if (_e instanceof BidPricingError) return { success: false, code: _e.code, error: _e.message };
    if (_e instanceof AwardConflict) {
      // Course perdue contre une autre attribution : si celle-ci a retenu CE bid, c'est un rejeu (une seule commande).
      const replay = await replayIfAlreadyAwarded(input.auctionId, input.winnerBidId);
      if (replay) return replay;
      return { success: false, code: _e.code, error: _e.message };
    }
    const e = asError(_e);
    console.error('awardAuction error:', e);
    return { success: false, error: e.message || 'Erreur de concurrence' };
  }
}

async function replayIfAlreadyAwarded(auctionId: string, winnerBidId: string) {
  const auction = await db.query.auctions.findFirst({ where: eq(schema.auctions.id, auctionId), columns: { id: true, status: true, winnerBidId: true } });
  if (!auction || auction.status !== 'AWARDED' || auction.winnerBidId !== winnerBidId) return null;
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.auctionId, auctionId), columns: { id: true, totalAmount: true, awardPricingSnapshot: true } });
  if (!order) return null;
  const award = ((order.awardPricingSnapshot ?? {}) as { award?: { fingerprint?: string } }).award;
  return {
    success: true as const,
    data: { auctionId, winnerBidId, status: 'AWARDED', orderId: order.id, totalAmount: String(order.totalAmount), pricingLabel: null, fingerprint: award?.fingerprint ?? null, idempotent: true },
  };
}
