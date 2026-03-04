'use server';

import { prisma } from '@/lib/prisma';
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
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { targetZone: true },
    });
    if (!auction) return { success: false, error: 'Enchère introuvable' };

    const zoneId = targetZoneId ?? auction.targetZoneId;
    const subCatId = subCategoryId ?? auction.subCategoryId;

    // 2. Résoudre le chemin de la zone cible pour le matching géographique
    let targetZone: { id: string; path: string | null; parentId: string | null; climaticRegionId: string } | null = null;
    if (zoneId) {
      targetZone = await prisma.zone.findUnique({
        where: { id: zoneId },
        select: { id: true, path: true, parentId: true, climaticRegionId: true },
      });
    }

    // 3. Vérifier si la sous-catégorie est bloquée dans la zone
    if (subCatId && zoneId) {
      const sub = await prisma.subCategory.findUnique({ where: { id: subCatId } });
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
        const siblings = await prisma.zone.findMany({
          where: { parentId: targetZone.parentId, id: { not: targetZone.id }, isActive: true },
          select: { id: true },
        });
        if (siblings.length > 0) {
          zonePriority.push({ priority: 2, zoneIds: siblings.map((z) => z.id) });
        }
      }

      // Priorité 3 : même région climatique (fallback large)
      const regionZones = await prisma.zone.findMany({
        where: {
          climaticRegionId: targetZone.climaticRegionId,
          id: { notIn: zonePriority.flatMap((zp) => zp.zoneIds) },
          isActive: true,
        },
        select: { id: true },
      });
      if (regionZones.length > 0) {
        zonePriority.push({ priority: 3, zoneIds: regionZones.map((z) => z.id) });
      }
    }

    // 5. Récupérer les producteurs par couche de priorité
    const allZoneIds = zonePriority.flatMap((zp) => zp.zoneIds);

    const producers = await prisma.producer.findMany({
      where: {
        status: 'ACTIVE',
        ...(allZoneIds.length > 0 ? { zoneId: { in: allZoneIds } } : {}),
        // Exclure les producteurs qui ont déjà soumis un bid
        bids: { none: { auctionId } },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            trustScore: {
              select: { globalScore: true, reliabilityIndex: true, complianceIndex: true, resilienceBonus: true },
            },
          },
        },
        products: subCatId
          ? { where: { subCategoryId: subCatId, quantityForSale: { gt: 0 } }, take: 1 }
          : undefined,
      },
      take: limit * 2, // prendre plus pour trier après
    });

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

    const scored: ScoredProducer[] = producers.map((p) => ({
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
        hasMatchingProduct: subCatId ? (p.products?.length ?? 0) > 0 : null,
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
    const sub = await prisma.subCategory.findUnique({ where: { id: input.subCategoryId } });
    if (!sub) return { success: false, error: 'Sous-catégorie introuvable' };

    // If targetZone provided, ensure subCategory not blocked
    if (input.targetZoneId) {
      if (sub.blockedZoneIds?.includes(input.targetZoneId)) {
        return { success: false, error: 'Sous-catégorie bloquée dans la zone cible' };
      }
    }

    const created = await prisma.auction.create({
      data: {
        buyerId: userId,
        subCategoryId: input.subCategoryId,
        quantity: input.quantity,
        unit: input.unit ?? 'TONNE',
        maxPricePerUnit: input.maxPricePerUnit,
        deadline: dl,
        targetZoneId: input.targetZoneId ?? null,
      },
    });

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
    const producer = await prisma.producer.findUnique({ where: { userId } });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    const auction = await prisma.auction.findUnique({ where: { id: input.auctionId } });
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

    const bid = await prisma.bid.upsert({
      where: {
        auctionId_producerId: {
          auctionId: input.auctionId,
          producerId: producer.id,
        },
      },
      create: {
        auctionId: input.auctionId,
        producerId: producer.id,
        offeredPrice: input.offeredPrice,
      },
      update: {
        offeredPrice: input.offeredPrice,
      },
    });

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
    return await prisma.$transaction(async (tx) => {
      // 1. Lire l'enchère avec verrou partagé
      const auction = await tx.auction.findUnique({ where: { id: input.auctionId } });
      if (!auction) throw new Error('Enchère introuvable');
      if (auction.status !== 'OPEN') throw new Error('Enchère déjà attribuée ou fermée');

      // 2. Tentative d'attribution avec optimistic lock
      //    On incrémente la version ET on passe le statut à AWARDED
      //    SEULEMENT si la version n'a pas changé entre-temps.
      const updated = await tx.$executeRaw`
        UPDATE "auctions"
        SET "status" = 'AWARDED',
            "version" = "version" + 1,
            "updatedAt" = NOW()
        WHERE "id" = ${input.auctionId}
          AND "version" = ${auction.version}
          AND "status" = 'OPEN'
      `;

      if (updated === 0) {
        throw new Error(
          'Conflit de concurrence : l\'enchère a été modifiée par un autre processus. Réessayez.'
        );
      }

      // 3. Marquer le bid gagnant
      await tx.bid.update({
        where: { id: input.winnerBidId },
        data: { isWinner: true },
      });

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
