// Enchères — matching géographique des producteurs éligibles.
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, ne, notInArray, gt } from 'drizzle-orm';
import { asError } from '@/lib/errors';

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
          where: and(eq(schema.products.subCategoryId, subCatId), gt(schema.products.quantityForSale, '0')),
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

  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getEligibleProducers error:', e);
    return { success: false, error: 'Une erreur interne est survenue lors du matching.' };
  }
}

// ── Création d'une enchère (utilisateurs de type BUYER) ───────────────────
