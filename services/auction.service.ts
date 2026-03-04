'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, ne, inArray, notInArray, gt } from 'drizzle-orm';
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
  const { auctionId, subCategoryId, targetZoneId, limit = 50 } = input;

  try {
    // 1. Charger l'enchère
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, auctionId),
      with: { targetZone: true },
    });
    if (!auction) return { success: false, error: 'Enchère introuvable' };

    const zoneId = targetZoneId ?? auction.targetZoneId;
    const subCatId = subCategoryId ?? auction.subCategoryId;

    // 2. Résoudre le chemin de la zone cible pour le matching géographique
    let targetZone: { id: string; path: string | null; parentId: string | null; climaticRegionId: string } | null = null;
    if (zoneId) {
      targetZone = await db.query.zones.findFirst({
        where: eq(schema.zones.id, zoneId),
        columns: { id: true, path: true, parentId: true, climaticRegionId: true },
      }) as any;
    }

    // 3. Vérifier si la sous-catégorie est bloquée dans la zone
    if (subCatId && zoneId) {
      const sub = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, subCatId) });
      if (sub?.blockedZoneIds.includes(zoneId)) {
        return { success: false, error: 'Cette sous-catégorie est bloquée dans la zone cible par la DR.' };
      }
    }

    // 4. Construire les ensembles de zones par priorité
    const zonePriority: { priority: number; zoneIds: string[] }[] = [];

    if (targetZone) {
      // Priorité 1 : même zone
      zonePriority.push({ priority: 1, zoneIds: [targetZone.id] });

      // Priorité 2 : zones sœurs (même parent)
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
          zonePriority.push({ priority: 2, zoneIds: siblings.map((z) => z.id) });
        }
      }

      // Priorité 3 : même région climatique (fallback large)
      const excludeIds = zonePriority.flatMap((zp) => zp.zoneIds);
      const regionConditions = [
        eq(schema.zones.climaticRegionId, targetZone.climaticRegionId),
        eq(schema.zones.isActive, true),
      ];
      if (excludeIds.length > 0) {
        regionConditions.push(notInArray(schema.zones.id, excludeIds));
      }
      const regionZones = await db.query.zones.findMany({
        where: and(...regionConditions),
        columns: { id: true },
      });
      if (regionZones.length > 0) {
        zonePriority.push({ priority: 3, zoneIds: regionZones.map((z) => z.id) });
      }
    }

    // 5. Récupérer les producteurs par couche de priorité
    const allZoneIds = zonePriority.flatMap((zp) => zp.zoneIds);

    // Exclude producers that already submitted a bid for this auction
    const existingBids = await db
      .select({ producerId: schema.bids.producerId })
      .from(schema.bids)
      .where(eq(schema.bids.auctionId, auctionId));
    const excludeProducerIds = existingBids.map(b => b.producerId);

    const producerConditions = [eq(schema.producers.status, 'ACTIVE')];
    if (allZoneIds.length > 0) {
      producerConditions.push(inArray(schema.producers.zoneId, allZoneIds));
    }
    if (excludeProducerIds.length > 0) {
      producerConditions.push(notInArray(schema.producers.id, excludeProducerIds));
    }

    const producers = await db.query.producers.findMany({
      where: and(...producerConditions),
      with: {
        user: {
          columns: { id: true, name: true },
          with: {
            trustScore: {
              columns: { globalScore: true, reliabilityIndex: true, complianceIndex: true, resilienceBonus: true },
            } as any,
          },
        },
        products: subCatId
          ? {
              where: (t: any, { and: andOp, eq: eqOp, gt: gtOp }: any) =>
                andOp(eqOp(t.subCategoryId, subCatId), gtOp(t.quantityForSale, 0)),
              limit: 1,
            }
          : undefined,
      },
      limit: limit * 2, // prendre plus pour trier après
    }) as any;

    // 6. Annoter chaque producteur avec sa priorité géographique
    const zoneToP = new Map<string, number>();
    for (const zp of zonePriority) {
      for (const zid of zp.zoneIds) {
        if (!zoneToP.has(zid)) zoneToP.set(zid, zp.priority);
      }
    }

    type ScoredProducer = (typeof producers)[number] & {
      _geoPriority: number;
      _trustGlobal: number;
    };

    interface ScoredProducerData {
      _geoPriority: number;
      _trustGlobal: number;
    }

    const scored: ScoredProducer[] = producers.map((p: typeof producers[number]): ScoredProducer => ({
      ...p,
      _geoPriority: p.zoneId ? zoneToP.get(p.zoneId) ?? 99 : 99,
      _trustGlobal: p.user.trustScore?.globalScore ?? 0,
    }));

    // Tri : priorité géographique ASC, puis trustScore DESC
    scored.sort((a, b) => {
      if (a._geoPriority !== b._geoPriority) return a._geoPriority - b._geoPriority;
      return b._trustGlobal - a._trustGlobal;
    });

    return {
      success: true,
      data: scored.slice(0, limit).map((p) => ({
        producerId: p.id,
        userId: p.user.id,
        name: p.user.name,
        zoneId: p.zoneId,
        geoPriority: p._geoPriority,
        trustScore: p.user.trustScore,
        hasMatchingProduct: subCatId ? ((p.products as any)?.length ?? 0) > 0 : null,
      })),
    };
  } catch (e: any) {
    console.error('getEligibleProducers error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
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
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId) });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    const auction = await db.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
    if (!auction || auction.status !== 'OPEN') {
      return { success: false, error: 'Enchère fermée ou introuvable' };
    }

    if (new Date() > auction.deadline) {
      return { success: false, error: 'Délai dépassé' };
    }

    if (input.offeredPrice <= 0) {
      return { success: false, error: 'Le prix doit être supérieur à 0' };
    }

    if (input.offeredPrice > auction.maxPricePerUnit) {
      return { success: false, error: `Le prix ne peut dépasser le plafond de ${auction.maxPricePerUnit}` };
    }

    const [bid] = await db.insert(schema.bids)
      .values({
        auctionId: input.auctionId,
        producerId: producer.id,
        offeredPrice: input.offeredPrice,
      })
      .onConflictDoUpdate({
        target: [schema.bids.auctionId, schema.bids.producerId],
        set: {
          offeredPrice: input.offeredPrice,
        },
      })
      .returning();

    await audit({
      action: 'SUBMIT_BID',
      entityType: 'Bid',
      entityId: bid.id,
      actorId: userId,
      newValue: { auctionId: input.auctionId, offeredPrice: input.offeredPrice },
    });

    return { success: true, data: bid };
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
      // 1. Lire l'enchère avec verrou partagé
      const auction = await tx.query.auctions.findFirst({ where: eq(schema.auctions.id, input.auctionId) });
      if (!auction) throw new Error('Enchère introuvable');
      if (auction.status !== 'OPEN') throw new Error('Enchère déjà attribuée ou fermée');

      // 2. Tentative d'attribution avec optimistic lock
      //    On incrémente la version ET on passe le statut à AWARDED
      //    SEULEMENT si la version n'a pas changé entre-temps.
      const updated = await tx.update(schema.auctions)
        .set({
          status: 'AWARDED',
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
        throw new Error(
          'Conflit de concurrence : l\'enchère a été modifiée par un autre processus. Réessayez.'
        );
      }

      // 3. Marquer le bid gagnant
      await tx.update(schema.bids)
        .set({ isWinner: true })
        .where(eq(schema.bids.id, input.winnerBidId));

      // 4. Audit (via helper standard)
      await audit({
        action: 'AWARD_AUCTION',
        entityType: 'Auction',
        entityId: input.auctionId,
        actorId: userId,
        newValue: { winnerBidId: input.winnerBidId, version: auction.version + 1 },
      });

      return {
        success: true,
        data: { auctionId: input.auctionId, winnerBidId: input.winnerBidId },
      };
    });
  } catch (e: any) {
    console.error('awardAuction error:', e);
    return { success: false, error: e.message || 'Erreur de concurrence' };
  }
}
