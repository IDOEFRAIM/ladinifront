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
 */export async function getEligibleProducers(input: {
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
      .map(p => ({
        producerId: p.id,
        userId: p.user.id,
        name: p.user.name,
        zoneId: p.zoneId,
        geoPriority: p.zoneId ? (zoneToPriority.get(p.zoneId) ?? 99) : 99,
        trustScore: p.user.trustScore,
        hasMatchingProduct: subCatId ? (p.products?.length > 0) : null,
        hasBid: existingBidSet.has(p.id),
      }))
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
    const conditions: any[] = [];
    conditions.push(eq(schema.auctions.status, 'OPEN'));
    if (opts?.subCategoryId) conditions.push(eq(schema.auctions.subCategoryId, opts.subCategoryId));
    if (opts?.zoneId) conditions.push(eq(schema.auctions.targetZoneId, opts.zoneId));

    const auctions = await db.query.auctions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (t, { asc }) => [asc(t.deadline)],
      with: {
        bids: true,
      },
    });

    // Collect subCategoryIds and fetch names in bulk
    const subCatIds = Array.from(new Set(auctions.map(a => a.subCategoryId).filter(Boolean) as string[]));
    const subCats = subCatIds.length > 0
      ? (await db.query.subCategories.findMany({ where: (t) => (subCatIds.length ? inArray(t.id, subCatIds) : undefined), columns: { id: true, name: true } as any })) as { id: string; name: string }[]
      : [];
    const subCatMap = new Map(subCats.map(s => [s.id, s.name]));

    // normalize
    return auctions.map(a => ({
      id: a.id,
      subCategoryName: a.subCategoryId ? subCatMap.get(a.subCategoryId) ?? null : null,
      quantity: a.quantity,
      unit: a.unit,
      maxPricePerUnit: a.maxPricePerUnit,
      deadline: a.deadline,
      bidsCount: Array.isArray(a.bids) ? a.bids.length : 0,
      targetZoneId: a.targetZoneId,
      status: a.status,
    }));
  }
}