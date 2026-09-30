
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, inArray, lt } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { sendUserNotification } from '@/features/notifications/services/notification.service';
import { asError } from '@/lib/errors';
import { bidPricingView } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision } from '@/features/auction/pricing/award-decision';
import { AwardConflict, closeAuctionOnBid } from '@/features/auction/services/auction-award-core';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  AUCTION SETTLEMENT — Auto-Order + Lock Stock sur expiration        ║
// ╚══════════════════════════════════════════════════════════════════════╝

/**
 * Règle automatiquement les enchères expirées :
 * 1. Trouve toutes les enchères OPEN dont la deadline est passée.
 * 2. Pour chaque enchère, sélectionne le bid gagnant PARMI LES OFFRES CERTIFIÉES ET COMPARABLES (total le plus bas —
 *    voir `pricing/bid-pricing.ts`). Un bid legacy (base de prix inconnue) n'est JAMAIS choisi automatiquement,
 *    même si son montant brut est numériquement le plus bas (Phase B2c.1, invariant B11/B16) : l'enchère reste
 *    ouverte et le résultat porte `status: 'no_comparable_bids'` pour une résolution manuelle.
 * 3. Crée une Order (instantané de prix gelé) via le noyau `auction-award-core.ts` — commun avec l'attribution
 *    manuelle : même total, même règle, aucune divergence possible entre les deux chemins.
 * 4. Déduit le stock lié (Lock Stock).
 * 5. Notifie l'acheteur et le producteur gagnant.
 *
 * Conçu pour être appelé par un CRON job (ex: /api/cron/settle-auctions).
 */
export async function settleExpiredAuctions() {
  const results: { auctionId: string; status: 'settled' | 'no_bids' | 'no_comparable_bids' | 'error'; error?: string }[] = [];

  try {
    // 1. Trouver les enchères expirées et encore ouvertes
    const expiredAuctions = await db.query.auctions.findMany({
      where: and(
        eq(schema.auctions.status, 'OPEN'),
        lt(schema.auctions.deadline, new Date())
      ),
      with: {
        bids: true,
      },
    });

    if (expiredAuctions.length === 0) {
      return { success: true, message: 'Aucune enchère à régler', results: [] };
    }

    // 2. Traiter chaque enchère
    for (const auction of expiredAuctions) {
      try {
        if (!auction.bids || auction.bids.length === 0) {
          // Pas de bids → fermer simplement
          await db.update(schema.auctions)
            .set({ status: 'EXPIRED', version: auction.version + 1 })
            .where(and(
              eq(schema.auctions.id, auction.id),
              eq(schema.auctions.version, auction.version)
            ));

          results.push({ auctionId: auction.id, status: 'no_bids' });
          continue;
        }

        const terms = { quantity: auction.quantity, unit: auction.unit };
        const scored = auction.bids
          .map((b) => ({ bid: b, view: bidPricingView(b, terms) }))
          .filter((s) => s.view.comparable && s.view.comparableTotal !== null)
          .sort((a, b) => Number(a.view.comparableTotal) - Number(b.view.comparableTotal));

        if (scored.length === 0) {
          // Que des offres non comparables (base inconnue, ou incompatible avec l'enchère) : pas d'attribution
          // automatique. L'acheteur doit trancher manuellement (requalification ou attribution assumée).
          results.push({ auctionId: auction.id, status: 'no_comparable_bids' });
          continue;
        }

        const winnerBid = scored[0].bid;
        const decision = buildAwardDecision(winnerBid, { id: auction.id, buyerId: auction.buyerId, quantity: auction.quantity, unit: auction.unit });

        // 3. Transaction atomique : attribution + création commande + lock stock (noyau partagé avec `awardAuction`).
        const closed = await db.transaction((tx) => closeAuctionOnBid(tx, {
          auction: { id: auction.id, buyerId: auction.buyerId, quantity: auction.quantity, unit: auction.unit, status: auction.status, version: auction.version, targetZoneId: auction.targetZoneId },
          winnerBid: { id: winnerBid.id, producerId: winnerBid.producerId, linkedStockId: winnerBid.linkedStockId },
          decision,
          finalStatus: 'CLOSED',
          stockReason: 'Commande auto-générée',
        }));

        await audit({
          action: 'AUTO_SETTLE_AUCTION',
          entityType: 'Auction',
          entityId: auction.id,
          actorId: 'SYSTEM',
          newValue: {
            winnerBidId: winnerBid.id,
            producerId: winnerBid.producerId,
            totalAmount: closed.totalAmount,
            orderId: closed.orderId,
            fingerprint: closed.fingerprint,
            stockLocked: !!winnerBid.linkedStockId,
          },
        });

        // 5. Notifications
        await sendUserNotification(auction.buyerId, 'AUCTION_EXPIRED', { auctionId: auction.id });

        const loserProducerIds = closed.loserProducerIds;
        const loserProducers =
          loserProducerIds.length > 0
            ? await db.query.producers.findMany({
                where: inArray(schema.producers.id, loserProducerIds),
                columns: { id: true, userId: true },
              })
            : [];

        const loserUserIdByProducerId = new Map<string, string>();
        for (const p of loserProducers) {
          if (p.userId) loserUserIdByProducerId.set(p.id, p.userId);
        }

        for (const producerId of loserProducerIds) {
          const userId = loserUserIdByProducerId.get(producerId);
          if (userId) {
            await sendUserNotification(userId, 'AUCTION_LOST', { auctionId: auction.id });
          }
        }

        results.push({ auctionId: auction.id, status: 'settled' });

      } catch (_err: unknown) {
        if (_err instanceof AwardConflict) {
          // Une autre exécution (double cron, retry) a déjà réglé cette enchère entre-temps : pas une erreur.
          results.push({ auctionId: auction.id, status: 'settled' });
          continue;
        }
        const err = asError(_err);
        console.error(`Failed to settle auction ${auction.id}:`, err);
        results.push({ auctionId: auction.id, status: 'error', error: err.message });
      }
    }

    return { success: true, message: `${results.filter(r => r.status === 'settled').length} enchères réglées`, results };

  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('settleExpiredAuctions global error:', err);
    return { success: false, error: err.message, results };
  }
}
