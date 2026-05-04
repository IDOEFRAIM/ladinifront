'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, lt, desc, sql } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { sendUserNotification } from '@/services/notification.service';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  AUCTION SETTLEMENT — Auto-Order + Lock Stock sur expiration        ║
// ╚══════════════════════════════════════════════════════════════════════╝

/**
 * Règle automatiquement les enchères expirées :
 * 1. Trouve toutes les enchères OPEN dont la deadline est passée.
 * 2. Pour chaque enchère, sélectionne le bid gagnant (prix le plus bas).
 * 3. Crée une Order + OrderItem pour le gagnant.
 * 4. Déduit le stock lié (Lock Stock).
 * 5. Notifie l'acheteur et le producteur gagnant.
 *
 * Conçu pour être appelé par un CRON job (ex: /api/cron/settle-auctions).
 */
export async function settleExpiredAuctions() {
  const results: { auctionId: string; status: 'settled' | 'no_bids' | 'error'; error?: string }[] = [];

  try {
    // 1. Trouver les enchères expirées et encore ouvertes
    const expiredAuctions = await db.query.auctions.findMany({
      where: and(
        eq(schema.auctions.status, 'OPEN'),
        lt(schema.auctions.deadline, new Date())
      ),
      with: {
        bids: {
          columns: { id: true, producerId: true, offeredPrice: true, linkedStockId: true },
        },
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

        // 3. Sélectionner le meilleur bid (prix le plus bas = meilleur pour l'acheteur)
        const sortedBids = [...auction.bids].sort((a, b) => a.offeredPrice - b.offeredPrice);
        const winnerBid = sortedBids[0];

        // 4. Transaction atomique : attribution + création commande + lock stock
        await db.transaction(async (tx) => {
          // 4a. Optimistic lock sur l'enchère
          const [updated] = await tx.update(schema.auctions)
            .set({
              status: 'CLOSED',
              version: auction.version + 1,
            })
            .where(
              and(
                eq(schema.auctions.id, auction.id),
                eq(schema.auctions.version, auction.version),
                eq(schema.auctions.status, 'OPEN')
              )
            )
            .returning({ id: schema.auctions.id });

          if (!updated) {
            throw new Error('Conflit de concurrence lors du règlement');
          }

          // 4b. Marquer le bid gagnant
          await tx.update(schema.bids)
            .set({ isWinner: true })
            .where(eq(schema.bids.id, winnerBid.id));

          // 4c. Résoudre le buyerProfile
          let buyerProfile = await tx.query.buyerProfiles.findFirst({
            where: eq(schema.buyerProfiles.userId, auction.buyerId),
            columns: { id: true },
          });
          if (!buyerProfile) {
            const [created] = await tx.insert(schema.buyerProfiles)
              .values({
                userId: auction.buyerId,
                buyerTypeId: null,
                establishmentName: null,
                defaultDeliveryAddress: null,
                isVerified: false,
              })
              .returning({ id: schema.buyerProfiles.id });
            buyerProfile = created;
          }

          // 4d. Charger les infos de l'acheteur
          const buyerUser = await tx.query.users.findFirst({
            where: eq(schema.users.id, auction.buyerId),
            columns: { name: true, phone: true },
          });

          // 4e. Calculer le montant total
          const totalAmount = Number(winnerBid.offeredPrice) * Number(auction.quantity);

          // 4f. Créer la commande (idempotent via unique constraint sur auctionId)
          const existingOrder = await tx.query.orders.findFirst({
            where: eq(schema.orders.auctionId, auction.id),
            columns: { id: true },
          });

          let orderId: string;
          if (!existingOrder) {
            const [newOrder] = await tx.insert(schema.orders).values({
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
            }).returning({ id: schema.orders.id });
            orderId = newOrder.id;

            // 4g. Créer l'OrderItem
            // On a besoin d'un produit lié au producteur — chercher le meilleur match
            const producerProducts = await tx.query.products.findMany({
              where: eq(schema.products.producerId, winnerBid.producerId),
              columns: { id: true, price: true, subCategoryId: true },
              limit: 10,
            });

            // Trouver le produit de la même sous-catégorie que l'enchère
            const matchingProduct = producerProducts.find(p => p.subCategoryId === auction.subCategoryId)
              || producerProducts[0];

            if (matchingProduct) {
              await tx.insert(schema.orderItems).values({
                orderId,
                productId: matchingProduct.id,
                quantity: auction.quantity,
                priceAtSale: winnerBid.offeredPrice,
              });
            }
          } else {
            orderId = existingOrder.id;
          }

          // 4h. LOCK STOCK — Déduire la quantité du stock lié
          if (winnerBid.linkedStockId) {
            // Vérifier le stock disponible
            const stock = await tx.query.stocks.findFirst({
              where: eq(schema.stocks.id, winnerBid.linkedStockId),
              columns: { id: true, quantity: true },
            });

            if (stock && stock.quantity >= auction.quantity) {
              // Déduire le stock
              await tx.update(schema.stocks)
                .set({
                  quantity: sql`${schema.stocks.quantity} - ${auction.quantity}`,
                })
                .where(eq(schema.stocks.id, winnerBid.linkedStockId));

              // Enregistrer le mouvement de stock
              await tx.insert(schema.stockMovements).values({
                stockId: winnerBid.linkedStockId,
                type: 'SALE',
                quantity: -auction.quantity,
                reason: `Enchère #${auction.id.slice(0, 8)} — Commande auto-générée`,
              });
            }
          }

          // 4i. Audit
          await audit({
            action: 'AUTO_SETTLE_AUCTION',
            entityType: 'Auction',
            entityId: auction.id,
            actorId: 'SYSTEM',
            newValue: {
              winnerBidId: winnerBid.id,
              producerId: winnerBid.producerId,
              totalAmount,
              orderId,
              stockLocked: !!winnerBid.linkedStockId,
            },
          });
        });

        // 5. Notifications
        await sendUserNotification(auction.buyerId, 'AUCTION_EXPIRED', { auctionId: auction.id });

        // Notifier les perdants
        const loserBids = sortedBids.slice(1);
        for (const loser of loserBids) {
          const loserProducer = await db.query.producers.findFirst({
            where: eq(schema.producers.id, loser.producerId),
            columns: { userId: true },
          });
          if (loserProducer) {
            await sendUserNotification(loserProducer.userId, 'AUCTION_LOST', { auctionId: auction.id });
          }
        }

        results.push({ auctionId: auction.id, status: 'settled' });

      } catch (err: any) {
        console.error(`Failed to settle auction ${auction.id}:`, err);
        results.push({ auctionId: auction.id, status: 'error', error: err.message });
      }
    }

    return { success: true, message: `${results.filter(r => r.status === 'settled').length} enchères réglées`, results };

  } catch (err: any) {
    console.error('settleExpiredAuctions global error:', err);
    return { success: false, error: err.message, results };
  }
}
