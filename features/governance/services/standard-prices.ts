import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { assertDRChief } from '@/features/governance/services/governance-guards';
import { asError } from '@/lib/errors';

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

    const updateSet: Record<string, unknown> = {
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
  } catch (_e: unknown) {
    const e = asError(_e);
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
  } catch (_e: unknown) {
    const e = asError(_e);
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
  } catch (_e: unknown) {
    const e = asError(_e);
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
