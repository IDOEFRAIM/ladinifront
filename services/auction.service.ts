'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, ne, notInArray, gt, sql, desc, asc } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  SERVICE ENCHÈRES – Matching Géographique & Attribution Sécurisée  ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Matching géographique ────────────────────────────────────────────────

/**
 * Récupère les producteurs éligibles pour une enchère.
 *
 * Stratégie de matching :
 * 1. Prioriser les producteurs de la même zone (targetZoneId).
 * 2. Étendre aux zones du même parent (zones limitrophes / même région).
 * 3. Étendre au même climaticRegionId si nécessaire.
 *
 * Le `path` materialized-path du modèle Zone est utilisé pour le matching :
 *   - Zone exacte = path identique
 *   - Zone sœur   = même parent path
 *   - Région       = 1er segment du path identique
 *
 * Filtres additionnels :
 *   - Producteur ACTIVE uniquement
 *   - Non bloqué dans la zone (SubCategory.blockedZoneIds)
 *   - Trié par TrustScore décroissant (si présent)
 */
export async function getEligibleProducers(input: {
  auctionId: string;
  subCategoryId?: string;
  targetZoneId?: string;
  limit?: number;
}) {
  // 1. Validation stricte de l'entrée pour éviter l'erreur SQL "params: 1,,1"
  if (!input || !input.auctionId || typeof input.auctionId !== 'string') {
    console.error('getEligibleProducers: auctionId est invalide ou manquant', input);
    return { success: false, error: 'ID de l\'enchère requis' };
  }

  const { auctionId, subCategoryId, targetZoneId, limit = 50 } = input;

  try {
    // 2. Charger l'enchère (Vérifier si elle existe)
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, auctionId),
      with: { targetZone: true },
    });
    
    if (!auction) {
      return { success: false, error: 'Enchère introuvable dans la base de données' };
    }

    const zoneId = targetZoneId ?? auction.targetZoneId;
    const subCatId = subCategoryId ?? auction.subCategoryId;

    // 3. Résoudre les priorités de zones
    const zonePriority: { priority: number; zoneIds: string[] }[] = [];
    let targetZone = null;

    if (zoneId) {
      targetZone = await db.query.zones.findFirst({
        where: eq(schema.zones.id, zoneId),
        columns: { id: true, parentId: true, climaticRegionId: true },
      });
    }

    if (targetZone) {
      // P1: Même zone
      zonePriority.push({ priority: 1, zoneIds: [targetZone.id] });

      // P2: Zones sœurs
      if (targetZone.parentId) {
        const siblings = await db.query.zones.findMany({
          where: and(
            eq(schema.zones.parentId, targetZone.parentId),
            ne(schema.zones.id, targetZone.id),
            eq(schema.zones.isActive, true)
          ),
          columns: { id: true },
        });
        if (siblings.length > 0) {
          zonePriority.push({ priority: 2, zoneIds: siblings.map(z => z.id) });
        }
      }

      // P3: Même région climatique (fallback)
      const excludeIds = zonePriority.flatMap(zp => zp.zoneIds);
      const regionZones = await db.query.zones.findMany({
        where: and(
          eq(schema.zones.climaticRegionId, targetZone.climaticRegionId),
          eq(schema.zones.isActive, true),
          excludeIds.length > 0 ? notInArray(schema.zones.id, excludeIds) : undefined
        ),
        columns: { id: true },
      });
      if (regionZones.length > 0) {
        zonePriority.push({ priority: 3, zoneIds: regionZones.map(z => z.id) });
      }
    }

    // 4. Filtrer les producteurs (Actifs + Pas encore de bid)
    const allZoneIds = zonePriority.flatMap(zp => zp.zoneIds);
    
    // Do NOT exclude producers who already submitted bids — we want to display them too.
    const existingBids = await db
      .select({ producerId: schema.bids.producerId })
      .from(schema.bids)
      .where(eq(schema.bids.auctionId, auctionId));
    const existingBidSet = new Set(existingBids.map(b => b.producerId));

    // Fetch active producers across zones (we'll sort by geo priority afterwards so zone producers come first)
    const producers = await db.query.producers.findMany({
      where: eq(schema.producers.status, 'ACTIVE'),
      with: {
        user: {
          columns: { id: true, name: true },
          with: { trustScore: true },
        },
        products: subCatId ? {
          where: and(eq(schema.products.subCategoryId, subCatId), gt(schema.products.quantityForSale, 0)),
          limit: 1,
        } : undefined,
      },
      limit: Math.max(100, limit * 5),
    });

    // 5. Scoring et Tri
    const zoneToPriority = new Map<string, number>();
    zonePriority.forEach(zp => zp.zoneIds.forEach(zid => {
      if (!zoneToPriority.has(zid)) zoneToPriority.set(zid, zp.priority);
    }));

    const result = producers
      .map(p => {
        // Some producer rows may lack the eager-loaded `user` relation (null) due to data inconsistency.
        // Use safe fallbacks to avoid runtime TypeErrors.
        const uid = p.user?.id ?? p.userId ?? null;
        const uname = p.user?.name ?? (p as any).name ?? 'Producteur';
        const tscore = p.user?.trustScore ?? null;
        if (!p.user) console.warn('Producer missing user relation for producer id', p.id);

        return {
          producerId: p.id,
          userId: uid,
          name: uname,
          zoneId: p.zoneId,
          geoPriority: p.zoneId ? (zoneToPriority.get(p.zoneId) ?? 99) : 99,
          trustScore: tscore,
          hasMatchingProduct: subCatId ? (p.products?.length > 0) : null,
          hasBid: existingBidSet.has(p.id),
        };
      })
      .sort((a, b) => {
        if (a.geoPriority !== b.geoPriority) return a.geoPriority - b.geoPriority;
        return (b.trustScore?.globalScore ?? 0) - (a.trustScore?.globalScore ?? 0);
      })
      .slice(0, limit);

    return { success: true, data: result };

  } catch (e: any) {
    console.error('getEligibleProducers error:', e);
    return { success: false, error: 'Une erreur interne est survenue lors du matching.' };
  }
}

// ── Création d'une enchère (utilisateurs de type BUYER) ───────────────────
export async function createAuction(input: {
  subCategoryId: string;
  quantity: number;
  unit?: 'TONNE' | 'KG' | 'LITRE' | 'BAG';
  maxPricePerUnit: number;
  deadline: string; // ISO
  targetZoneId?: string | null;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    // Validate basic fields
    if (!input.subCategoryId) return { success: false, error: 'Sous-catégorie requise' };
    if (!input.quantity || input.quantity <= 0) return { success: false, error: 'Quantité invalide' };
    if (!input.maxPricePerUnit || input.maxPricePerUnit <= 0) return { success: false, error: 'Plafond prix invalide' };
    const dl = new Date(input.deadline);
    if (isNaN(dl.getTime()) || dl <= new Date()) return { success: false, error: 'Deadline invalide' };

    // Verify subCategory exists
    const sub = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, input.subCategoryId) });
    if (!sub) return { success: false, error: 'Sous-catégorie introuvable' };

    // If targetZone provided, ensure subCategory not blocked
    if (input.targetZoneId) {
      if (sub.blockedZoneIds?.includes(input.targetZoneId)) {
        return { success: false, error: 'Sous-catégorie bloquée dans la zone cible' };
      }
    }

    const [created] = await db.insert(schema.auctions).values({
      buyerId: userId,
      subCategoryId: input.subCategoryId,
      quantity: input.quantity,
      unit: input.unit ?? 'TONNE',
      maxPricePerUnit: input.maxPricePerUnit,
      deadline: dl,
      targetZoneId: input.targetZoneId ?? null,
    }).returning();

    await audit({
      action: 'CREATE_AUCTION',
      entityType: 'Auction',
      entityId: created.id,
      actorId: userId,
      newValue: { subCategoryId: input.subCategoryId, quantity: input.quantity, maxPricePerUnit: input.maxPricePerUnit, deadline: input.deadline, targetZoneId: input.targetZoneId ?? null },
    });

    return { success: true, data: created };
  } catch (e: any) {
    console.error('createAuction error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

// ── Soumission d'un bid ──────────────────────────────────────────────────

export async function submitBid(input: {
  auctionId: string;
  offeredPrice: number;
  linkedStockId?: string | null;
  message:string | null
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

    if (input.offeredPrice > auction.maxPricePerUnit) {
      return { success: false, error: `Le prix ne peut dépasser le plafond de ${auction.maxPricePerUnit}` };
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
          offeredPrice: input.offeredPrice,
          linkedStockId,
          message: input?.message ?? null,
        })
        .onConflictDoUpdate({
          target: [schema.bids.auctionId, schema.bids.producerId],
          set: {
            offeredPrice: input.offeredPrice,
            linkedStockId,
            message: input?.message ?? null,
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
  } catch (e: any) {
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
          totalAmount,
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
          if (stock && stock.quantity >= auction.quantity) {
            await tx.update(schema.stocks)
              .set({ quantity: sql`${schema.stocks.quantity} - ${auction.quantity}` })
              .where(eq(schema.stocks.id, winnerBid.linkedStockId));
            await tx.insert(schema.stockMovements).values({
              stockId: winnerBid.linkedStockId,
              type: 'SALE',
              quantity: -auction.quantity,
              reason: `Enchère #${auction.id.slice(0, 8)} — Attribution manuelle`,
            });
          }
        }
      }

      // 4. Notifier les perdants (logiquement via notification service)
      try {
        const { sendUserNotification } = await import('@/services/notification.service');
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
  } catch (e: any) {
    console.error('awardAuction error:', e);
    return { success: false, error: e.message || 'Erreur de concurrence' };
  }
}

// ── Liste des bids pour une enchère (visible par le créateur) ──────────
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
  } catch (e: any) {
    console.error('getBidsForAuction error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// ── Annulation d'une enchère ──────────────────────────────────────────
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
  } catch (e: any) {
    console.error('cancelAuction error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

// ── Mes enchères (pour le buyer) ──────────────────────────────────────
export async function getMyAuctions() {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const results = await db.query.auctions.findMany({
      where: eq(schema.auctions.buyerId, userId),
      orderBy: [desc(schema.auctions.createdAt)],
      with: {
        subCategory: { columns: { id: true, name: true } },
        bids: { columns: { id: true } },
        winnerBid: {
          columns: { id: true, offeredPrice: true, producerId: true },
          with: { producer: { columns: { id: true, businessName: true } } },
        },
      },
    });

    return {
      success: true,
      data: results.map(a => ({
        id: a.id,
        subCategoryName: a.subCategory?.name ?? 'Produit inconnu',
        description: a.description,
        quantity: a.quantity,
        unit: a.unit,
        maxPricePerUnit: a.maxPricePerUnit,
        deadline: a.deadline,
        status: a.status,
        bidsCount: a.bids?.length ?? 0,
        winnerBid: a.winnerBid ? {
          id: a.winnerBid.id,
          offeredPrice: a.winnerBid.offeredPrice,
          producerName: a.winnerBid.producer?.businessName ?? 'Producteur',
        } : null,
        awardedAt: a.awardedAt,
        createdAt: a.createdAt,
      })),
    };
  } catch (e: any) {
    console.error('getMyAuctions error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// ── Mes bids (pour le producteur) ─────────────────────────────────────
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
  } catch (e: any) {
    console.error('getMyBids error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// Récupère une enchère par id
export async function getAuctionById(id: string) {
  try {
    // Fetch auction with basic relations (buyer, targetZone, bids)
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, id),
      with: {
        buyer: true,
        targetZone: true,
        bids: true,
      },
    });

    if (!auction) return null;

    // Fetch subCategory name separately to avoid relying on Drizzle 'with' typing
    let subCategory = null;
    if (auction.subCategoryId) {
      subCategory = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, auction.subCategoryId), columns: { id: true, name: true } });
    }

    return {
      ...auction,
      subCategory: subCategory ?? null,
    } as any;
  } catch (e) {
    console.error('getAuctionById error', e);
    return null;
  }
}

// Liste les enchères OPEN (avec filtres optionnels)
export async function getOpenAuctions(opts?: { subCategoryId?: string; zoneId?: string }) {
  try {
    const conditions = [eq(schema.auctions.status, 'OPEN')];
    
    if (opts?.subCategoryId) conditions.push(eq(schema.auctions.subCategoryId, opts.subCategoryId));
    if (opts?.zoneId) conditions.push(eq(schema.auctions.targetZoneId, opts.zoneId));

    const results = await db.query.auctions.findMany({
      where: and(...conditions),
      orderBy: (t, { asc }) => [asc(t.deadline)],
      with: {
        // Ces clés doivent correspondre EXACTEMENT aux noms dans auctionsRelations
        subCategory: { 
          columns: { id: true, name: true } 
        },
        bids: { 
          columns: { id: true } 
        },
      },
    });

    // Plus besoin de "as any", TypeScript comprend maintenant la structure
    return results.map(a => ({
      id: a.id,
      subCategoryName: a.subCategory?.name || "Produit inconnu",
      quantity: a.quantity,
      unit: a.unit,
      maxPricePerUnit: a.maxPricePerUnit,
      deadline: a.deadline,
      bidsCount: a.bids.length,
      targetZoneId: a.targetZoneId,
      status: a.status,
    }));
  } catch (e) {
    console.error('getOpenAuctions error:', e);
    return [];
  }
}