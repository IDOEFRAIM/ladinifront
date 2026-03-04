'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  SERVICE DR – Gouvernance des Directions Régionales                ║
// ║  • Gestion des catégories / sous-catégories                        ║
// ║  • Prix Standards (Indice DRDR)                                    ║
// ║  • Verrouillage de sous-catégorie par zone                         ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Helpers ──────────────────────────────────────────────────────────────

/** Vérifier que l'appelant est bien Chef de DR (PRODUCER certifié) ou SUPERADMIN */
async function assertDRChief(userId: string, zoneId: string): Promise<any> {
  // Load user and producer explicitly to avoid relation metadata reliance
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) throw new Error('Utilisateur introuvable');

  // SUPERADMIN bypass
  if (user.role === 'SUPERADMIN') return user;

  // If user is producer, fetch producer record
  let producer: any = null;
  if (user.role === 'PRODUCER') {
    producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, user.id) });
  }

  // Chef de DR = PRODUCER certifié rattaché à cette zone
  if (user.role !== 'PRODUCER' || !producer?.isCertified) {
    throw new Error('Seul un Chef de DR certifié ou un SUPERADMIN peut effectuer cette action.');
  }

  if (producer.zoneId !== zoneId) {
    throw new Error('Vous n\'êtes pas rattaché à cette zone.');
  }

  return { ...user, producer };
}

// ── Catégories ───────────────────────────────────────────────────────────

export async function createCategory(data: { name: string; description?: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const existing = await db.query.categories.findFirst({ where: eq(schema.categories.name, data.name) });
    if (existing) return { success: false, error: 'Cette catégorie existe déjà.' };

    const [category] = await db.insert(schema.categories).values(data).returning();

    await audit({
      action: 'CREATE_CATEGORY',
      actorId: userId,
      entityType: 'Category',
      entityId: category.id,
      newValue: { name: category.name },
    });

    return { success: true, data: category };
  } catch (e: any) {
    console.error('createCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function createSubCategory(data: { categoryId: string; name: string }) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const [sub] = await db.insert(schema.subCategories).values(data).returning();

    await audit({
      action: 'CREATE_SUBCATEGORY',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: sub.id,
      newValue: { name: sub.name, categoryId: sub.categoryId },
    });

    return { success: true, data: sub };
  } catch (e: any) {
    console.error('createSubCategory error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function getCategories() {
  try {
    interface Zone {
        id: string;
        name: string;
    }

    interface StandardPrice {
        id: string;
        subCategoryId: string;
        zoneId: string;
        pricePerUnit: number;
        unit: string;
        updatedById: string;
        updatedAt: Date;
        zone: Zone;
    }

    interface SubCategory {
        id: string;
        categoryId: string;
        name: string;
        blockedZoneIds: string[];
        standardPrices: StandardPrice[];
    }

    interface Category {
        id: string;
        name: string;
        description?: string | null;
        subCategories: SubCategory[];
    }

    // Load categories, subcategories, standard prices and zones explicitly
    const cats = await db.query.categories.findMany({ orderBy: (t: any, helpers: any) => [helpers.asc(t.name)] });

    const categoryIds = cats.map(c => c.id);
    const subCategories = categoryIds.length > 0
      ? await db.query.subCategories.findMany({
          where: (t, { inArray }) => inArray(t.categoryId, categoryIds),
          orderBy: (t: any, helpers: any) => [helpers.asc(t.name)],
        })
      : [];

    const subCategoryIds = subCategories.map(sc => sc.id);
    const standardPrices = subCategoryIds.length > 0
      ? await db.query.standardPrices.findMany({ where: (t, { inArray }) => inArray(t.subCategoryId, subCategoryIds) })
      : [];

    // Resolve zones referenced by standard prices
    const zoneIds = new Set<string>();
    for (const p of standardPrices) if (p.zoneId) zoneIds.add(p.zoneId);
    const zones = zoneIds.size > 0
      ? await db.query.zones.findMany({ where: (t, { inArray }) => inArray(t.id, Array.from(zoneIds)) })
      : [];
    const zoneMap = new Map(zones.map(z => [z.id, { id: z.id, name: z.name }]));

    // Attach zone objects to standard prices
    const standardPricesBySub = new Map<string, StandardPrice[]>();
    for (const p of standardPrices) {
      const sp: StandardPrice = {
        id: p.id,
        subCategoryId: p.subCategoryId,
        zoneId: p.zoneId,
        pricePerUnit: p.pricePerUnit,
        unit: p.unit,
        updatedById: p.updatedById,
        updatedAt: p.updatedAt,
        zone: p.zoneId ? (zoneMap.get(p.zoneId) as Zone) : { id: p.zoneId ?? '', name: '' },
      };
      const arr = standardPricesBySub.get(p.subCategoryId) ?? [];
      arr.push(sp);
      standardPricesBySub.set(p.subCategoryId, arr);
    }

    const categories: Category[] = cats.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      subCategories: subCategories
        .filter(sc => sc.categoryId === cat.id)
        .map(sc => ({
          id: sc.id,
          categoryId: sc.categoryId,
          name: sc.name,
          blockedZoneIds: sc.blockedZoneIds,
          standardPrices: standardPricesBySub.get(sc.id) ?? [],
        })),
    }));
    // Compute _count.products per subcategory
    const productCounts = await db
      .select({ subCategoryId: schema.products.subCategoryId, value: count() })
      .from(schema.products)
      .groupBy(schema.products.subCategoryId);
    const countMap = new Map(productCounts.map(c => [c.subCategoryId, c.value]));
    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      subCategories: cat.subCategories.map(sub => ({
        ...sub,
        _count: { products: countMap.get(sub.id) || 0 }
      }))
    }));
    return { success: true, data: categoriesWithCounts };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Prix Standards (Indice DRDR) ─────────────────────────────────────────

/**
 * Met à jour (ou crée) le prix standard d'une sous-catégorie pour une zone.
 * Seul un Chef de DR rattaché à cette zone peut le faire.
 */
export async function upsertStandardPrice(input: {
  subCategoryId: string;
  zoneId: string;
  pricePerUnit: number;
  unit?: 'KG' | 'TONNE' | 'LITRE' | 'BAG';
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertDRChief(userId, input.zoneId);

    if (input.pricePerUnit <= 0) {
      return { success: false, error: 'Le prix doit être positif.' };
    }

    const updateSet: Record<string, any> = {
      pricePerUnit: input.pricePerUnit,
      updatedById: userId,
    };
    if (input.unit) updateSet.unit = input.unit;

    const [price] = await db.insert(schema.standardPrices)
      .values({
        subCategoryId: input.subCategoryId,
        zoneId: input.zoneId,
        pricePerUnit: input.pricePerUnit,
        unit: input.unit ?? 'KG',
        updatedById: userId,
      })
      .onConflictDoUpdate({
        target: [schema.standardPrices.subCategoryId, schema.standardPrices.zoneId],
        set: updateSet,
      })
      .returning();

    await audit({
      action: 'UPSERT_STANDARD_PRICE',
      actorId: userId,
      entityType: 'StandardPrice',
      entityId: price.id,
      newValue: { pricePerUnit: input.pricePerUnit, unit: input.unit ?? 'KG', zoneId: input.zoneId },
    });

    return { success: true, data: price };
  } catch (e: any) {
    console.error('upsertStandardPrice error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

export async function getStandardPrices(zoneId: string) {
  try {
    // Load prices and resolve related subcategories, categories and updater users explicitly
    const prices = await db.query.standardPrices.findMany({
      where: eq(schema.standardPrices.zoneId, zoneId),
      orderBy: (t: any, helpers: any) => [helpers.desc(t.updatedAt)],
    });

    const subIds = Array.from(new Set(prices.map(p => p.subCategoryId).filter(Boolean)));
    const updatedByIds = Array.from(new Set(prices.map(p => p.updatedById).filter(Boolean)));

    const subCategories = subIds.length > 0
      ? await db.query.subCategories.findMany({ where: (t, { inArray }) => inArray(t.id, subIds) })
      : [];
    const categoryIds = Array.from(new Set(subCategories.map(s => s.categoryId).filter(Boolean)));
    const categories = categoryIds.length > 0
      ? await db.query.categories.findMany({ where: (t, { inArray }) => inArray(t.id, categoryIds) })
      : [];
    const users = updatedByIds.length > 0
      ? await db.query.users.findMany({ where: (t, { inArray }) => inArray(t.id, updatedByIds) })
      : [];

    const subMap = new Map(subCategories.map(s => [s.id, s]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const enriched = prices.map(p => ({
      ...p,
      subCategory: p.subCategoryId ? {
        id: p.subCategoryId,
        name: subMap.get(p.subCategoryId)?.name ?? '',
        category: subMap.get(p.subCategoryId)?.categoryId ? { id: subMap.get(p.subCategoryId)!.categoryId, name: categoryMap.get(subMap.get(p.subCategoryId)!.categoryId)?.name ?? '' } : null,
      } : null,
      updatedBy: p.updatedById ? userMap.get(p.updatedById) ?? null : null,
    }));

    return { success: true, data: enriched };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ── Verrouillage de sous-catégorie ───────────────────────────────────────

/**
 * Bloque ou débloque une sous-catégorie dans une zone donnée.
 * Implémenté via le champ `blockedZoneIds` (String[]) sur SubCategory.
 */
export async function toggleSubCategoryBlock(input: {
  subCategoryId: string;
  zoneId: string;
  block: boolean;
}) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    await assertDRChief(userId, input.zoneId);

    const sub = await db.query.subCategories.findFirst({
      where: eq(schema.subCategories.id, input.subCategoryId),
    });
    if (!sub) return { success: false, error: 'Sous-catégorie introuvable' };

    let updatedZones = [...sub.blockedZoneIds];

    if (input.block) {
      if (!updatedZones.includes(input.zoneId)) updatedZones.push(input.zoneId);
    } else {
      updatedZones = updatedZones.filter((z) => z !== input.zoneId);
    }

    const [updated] = await db.update(schema.subCategories)
      .set({ blockedZoneIds: updatedZones })
      .where(eq(schema.subCategories.id, input.subCategoryId))
      .returning();

    await audit({
      action: input.block ? 'BLOCK_SUBCATEGORY' : 'UNBLOCK_SUBCATEGORY',
      actorId: userId,
      entityType: 'SubCategory',
      entityId: updated.id,
      newValue: { blockedZoneIds: updatedZones, zoneId: input.zoneId },
    });

    return { success: true, data: updated };
  } catch (e: any) {
    console.error('toggleSubCategoryBlock error:', e);
    return { success: false, error: e.message || 'Erreur interne' };
  }
}

/**
 * Vérifie si un produit peut être vendu dans une zone.
 * Retourne false si la sous-catégorie est bloquée.
 */
export async function isProductAllowedInZone(productId: string, zoneId: string): Promise<boolean> {
  const product = await db.query.products.findFirst({ where: eq(schema.products.id, productId) });
  if (!product) return true;
  if (!product.subCategoryId) return true;
  const sub = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, product.subCategoryId) });
  if (!sub) return true;
  return !sub.blockedZoneIds.includes(zoneId);
}
