'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gt, ne, inArray, desc, sql } from 'drizzle-orm';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  CROSS-SELLING — Produits suggérés basés sur l'historique achat     ║
// ╚══════════════════════════════════════════════════════════════════════╝

/**
 * Analyse l'historique d'achat d'un acheteur et suggère des produits :
 *
 * 1. Identifie les catégories les plus achetées (ex: "Tomates").
 * 2. Cherche les crop_cycles actifs de producteurs proches qui produisent
 *    des cultures similaires.
 * 3. Retourne les produits disponibles de ces producteurs.
 *
 * Logique :
 * - Si un acheteur achète souvent des "Tomates", on cherche les producteurs
 *   proches dont les crop_cycles incluent des tomates et qui ont du stock.
 */
export async function suggestedProducts(userId: string, limit = 20) {
  if (!userId) return [];

  // 1. Trouver le profil acheteur
  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
    columns: { id: true },
  });
  if (!profile) return [];

  // 2. Charger l'historique d'achat : catégories + sous-catégories les plus commandées
  const pastOrders = await db.query.orders.findMany({
    where: eq(schema.orders.buyerId, profile.id),
    columns: { id: true },
    with: {
      items: {
        columns: { productId: true, quantity: true },
        with: {
          product: {
            columns: { categoryLabel: true, subCategoryId: true, producerId: true },
          },
        },
      },
    },
    limit: 100,
  });

  // 3. Compter les catégories/sous-catégories fréquentes
  const categoryFreq = new Map<string, number>();
  const subCategoryFreq = new Map<string, number>();
  const boughtProductIds = new Set<string>();

  for (const order of pastOrders) {
    for (const item of order.items) {
      boughtProductIds.add(item.productId);
      const cat = item.product.categoryLabel;
      const subCat = item.product.subCategoryId;
      if (cat) categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + item.quantity);
      if (subCat) subCategoryFreq.set(subCat, (subCategoryFreq.get(subCat) || 0) + item.quantity);
    }
  }

  if (categoryFreq.size === 0) {
    // Pas d'historique → retourner les produits populaires
    return getPopularProducts(limit);
  }

  // 4. Top catégories (les 3 plus fréquentes)
  const topCategories = [...categoryFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  // 5. Chercher les crop_cycles actifs dans des catégories similaires
  const activeCycles = await db.query.cropCycles.findMany({
    where: and(
      eq(schema.cropCycles.status, 'GROWING'),
      inArray(schema.cropCycles.cropType, topCategories)
    ),
    columns: { farmId: true, cropType: true, expectedHarvestDate: true },
    limit: 50,
  });

  // 6. Extraire les farmIds pour trouver les producteurs
  const farmIds = [...new Set(activeCycles.map(c => c.farmId))];
  let nearbyProducerIds: string[] = [];

  if (farmIds.length > 0) {
    const farms = await db.query.farms.findMany({
      where: inArray(schema.farms.id, farmIds),
      columns: { producerId: true },
    });
    nearbyProducerIds = [...new Set(farms.map(f => f.producerId))];
  }

  // 7. Chercher les produits disponibles de ces producteurs + même catégorie
  const conditions: any[] = [
    gt(schema.products.quantityForSale, 0),
    inArray(schema.products.categoryLabel, topCategories),
  ];

  if (nearbyProducerIds.length > 0) {
    conditions.push(inArray(schema.products.producerId, nearbyProducerIds));
  }

  const suggestions = await db.query.products.findMany({
    where: and(...conditions),
    columns: {
      id: true,
      name: true,
      categoryLabel: true,
      price: true,
      unit: true,
      quantityForSale: true,
      images: true,
    },
    with: {
      producer: {
        columns: { id: true, businessName: true, zoneId: true },
      },
    },
    limit: limit * 2, // Over-fetch to filter
  });

  // 8. Filtrer les produits déjà achetés et scorer
  const filtered = suggestions
    .filter(p => !boughtProductIds.has(p.id))
    .map(p => ({
      ...p,
      relevanceScore: (categoryFreq.get(p.categoryLabel) || 0),
      hasCropCycle: nearbyProducerIds.includes(p.producer.id),
    }))
    .sort((a, b) => {
      // Prioriser ceux avec crop_cycle actif, puis par fréquence d'achat
      if (a.hasCropCycle !== b.hasCropCycle) return a.hasCropCycle ? -1 : 1;
      return b.relevanceScore - a.relevanceScore;
    })
    .slice(0, limit);

  return filtered;
}

/**
 * Produits populaires (fallback quand pas d'historique).
 */
async function getPopularProducts(limit: number) {
  return db.query.products.findMany({
    where: gt(schema.products.quantityForSale, 0),
    orderBy: [desc(schema.products.createdAt)],
    columns: {
      id: true,
      name: true,
      categoryLabel: true,
      price: true,
      unit: true,
      quantityForSale: true,
      images: true,
    },
    with: {
      producer: { columns: { id: true, businessName: true } },
    },
    limit,
  });
}
