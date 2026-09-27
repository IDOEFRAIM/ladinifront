import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { count } from 'drizzle-orm';
import { updateSubCategoryMinimum, updateSubCategoryUnitConfig } from '@/features/governance/services/category-write';
import { asError } from '@/lib/errors';

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
        // Policy plateforme — voir updateSubCategoryMinimum. `null` = aucune
        // règle configurée (comportement historique).
        minimumOrderQuantity: string | null;
        minimumOrderUnit: string | null;
        // Policy plateforme — voir updateSubCategoryUnitConfig. `null` = pas
        // configuré (le backend continue de deviner l'unité depuis le texte libre).
        allowedUnits: string[] | null;
        priorityUnit: string | null;
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
          minimumOrderQuantity: sc.minimumOrderQuantity,
          minimumOrderUnit: sc.minimumOrderUnit,
          allowedUnits: sc.allowedUnits,
          priorityUnit: sc.priorityUnit,
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
  } catch (_e: unknown) {
    const e = asError(_e);
    return { success: false, error: e.message };
  }
}

// ── Prix Standards (Indice DRDR) ─────────────────────────────────────────
