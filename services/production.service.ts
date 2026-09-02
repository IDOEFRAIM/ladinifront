import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, asc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';

// (2026-09-02) `crop_cycles` a été remplacé par `market_offers` (structure de
// prévente dégraissée — voir src/db/schema/marketplace.ts, commit "switch
// schema"). Plusieurs champs de l'ANCIEN modèle producteur détaillé
// (areaSize, plantedAt, variety, growthStage, initialStock, hatchDate)
// n'existent plus sur `marketOffers` — intentionnel (simplification du
// schéma), pas un oubli : ce service est adapté à la structure RÉELLE
// actuelle plutôt que de garder des champs qui n'ont plus de colonne.

const productionTypeEnum = z.enum(['CROP', 'LIVESTOCK']);

const DeclareProductionSchema = z.object({
  farmId: z.string().uuid(),
  productLabel: z.string().min(1),
  productionType: productionTypeEnum.default('CROP'),
  subCategoryId: z.string().uuid().optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  estimatedAvailableAt: z.coerce.date().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().optional(),
  unit: z.string().min(1).default('KG'),
  status: z.string().min(1).default('DRAFT'),
  isPublic: z.boolean().default(false),
  preorderEnabled: z.boolean().default(false),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
  currentStock: z.number().nonnegative().optional(),
}).superRefine((data, ctx) => {
  if (data.productionType === 'CROP') {
    if (!data.expectedHarvestDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date de récolte requise', path: ['expectedHarvestDate'] });
    }
  } else {
    if (!data.species && !data.productLabel) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Espèce obligatoire pour l’élevage', path: ['species'] });
    }
    if (data.currentStock == null && data.availableQuantity == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stock initial ou disponible requis', path: ['currentStock'] });
    }
  }
});

const UpdateVisibilitySchema = z.object({
  marketOfferId: z.string().uuid(),
  isPublic: z.boolean().optional(),
  preorderEnabled: z.boolean().optional(),
  estimatedAvailableAt: z.coerce.date().nullable().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().nullable().optional(),
  status: z.string().min(1).optional(),
  currentStock: z.number().nonnegative().optional(),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
});

export type DeclareProductionInput = z.input<typeof DeclareProductionSchema>;
export type UpdateVisibilityInput = z.input<typeof UpdateVisibilitySchema>;

export type PublicProduction = {
  id: string;
  productLabel: string;
  productionType: z.infer<typeof productionTypeEnum>;
  estimatedAvailableAt: Date | null;
  expectedHarvestDate: Date | null;
  availableQuantity: number;
  reservedQuantity: number;
  pricePerUnit: number | null;
  unit: string;
  preorderEnabled: boolean;
  species: string | null;
  breed: string | null;
  currentStock: number;
  subCategory: { id: string; name: string } | null;
  producer: {
    id: string;
    businessName: string | null;
    logoUrl: string | null;
    zoneId: string | null;
    rating: number | null;
  } | null;
  farm: { id: string; name: string; location: string | null };
};

async function assertFarmOwnership(producerId: string, farmId: string): Promise<boolean> {
  const farm = await db.query.farms.findFirst({
    where: and(eq(schema.farms.id, farmId), eq(schema.farms.producerId, producerId)),
    columns: { id: true },
  });
  return Boolean(farm);
}

export async function declareFutureProduction(
  producerId: string,
  input: DeclareProductionInput,
): Promise<ApiResult<{ id: string }>> {
  try {
    if (!producerId) return fail('PRODUCER_REQUIRED');

    const parsed = DeclareProductionSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const data = parsed.data;

    const ownsFarm = await assertFarmOwnership(producerId, data.farmId);
    if (!ownsFarm) return fail('FARM_NOT_OWNED');

    const harvestValue = data.productionType === 'CROP' ? (data.expectedHarvestDate ?? new Date()) : undefined;

    const [created] = await db
      .insert(schema.marketOffers)
      .values({
        producerId,
        farmId: data.farmId,
        productLabel: data.productLabel,
        productionType: data.productionType,
        subCategoryId: data.subCategoryId ?? null,
        expectedHarvestDate: harvestValue,
        estimatedAvailableAt: data.estimatedAvailableAt ?? null,
        availableQuantity: String(data.availableQuantity ?? 0),
        pricePerUnit: data.pricePerUnit != null ? String(data.pricePerUnit) : null,
        unit: data.unit as any,
        status: data.status,
        isPublic: data.isPublic,
        preorderEnabled: data.preorderEnabled,
        species: data.species ?? null,
        breed: data.breed ?? null,
        currentStock: String(data.currentStock ?? 0),
      } satisfies typeof schema.marketOffers.$inferInsert)
      .returning({ id: schema.marketOffers.id });

    if (!created) return fail('CREATE_FAILED');
    return ok({ id: created.id });
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function updateProductionVisibility(
  producerId: string,
  input: UpdateVisibilityInput,
): Promise<ApiResult<{ id: string }>> {
  try {
    if (!producerId) return fail('PRODUCER_REQUIRED');

    const parsed = UpdateVisibilitySchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const data = parsed.data;

    const offer = await db.query.marketOffers.findFirst({
      where: eq(schema.marketOffers.id, data.marketOfferId),
      columns: { id: true, producerId: true, reservedQuantity: true, availableQuantity: true },
    });
    if (!offer) return fail('CYCLE_NOT_FOUND');
    if (offer.producerId !== producerId) return fail('FORBIDDEN');

    const patch: Partial<typeof schema.marketOffers.$inferInsert> = {};
    if (data.isPublic !== undefined) patch.isPublic = data.isPublic;
    if (data.preorderEnabled !== undefined) patch.preorderEnabled = data.preorderEnabled;
    if (data.estimatedAvailableAt !== undefined) patch.estimatedAvailableAt = data.estimatedAvailableAt;
    if (data.availableQuantity !== undefined) {
      if (data.availableQuantity < Number(offer.reservedQuantity ?? 0)) {
        return fail('AVAILABLE_LT_RESERVED');
      }
      patch.availableQuantity = String(data.availableQuantity);
    }
    if (data.pricePerUnit !== undefined) patch.pricePerUnit = data.pricePerUnit != null ? String(data.pricePerUnit) : null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.currentStock !== undefined) patch.currentStock = String(data.currentStock);
    if (data.species !== undefined) patch.species = data.species;
    if (data.breed !== undefined) patch.breed = data.breed;

    if (Object.keys(patch).length === 0) return ok({ id: offer.id });

    await db.update(schema.marketOffers).set(patch).where(eq(schema.marketOffers.id, offer.id));
    return ok({ id: offer.id });
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function getProducerProductions(producerId: string): Promise<ApiResult<PublicProduction[]>> {
  try {
    if (!producerId) return fail('PRODUCER_REQUIRED');

    const offers = await db.query.marketOffers.findMany({
      where: eq(schema.marketOffers.producerId, producerId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: {
        subCategory: { columns: { id: true, name: true } },
        farm: { columns: { id: true, name: true, location: true } },
        producer: { columns: { id: true, businessName: true, logoUrl: true, zoneId: true, rating: true } },
      },
    });

    return ok(offers.map(mapToPublicProduction));
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function getPublicFutureProductions(filters?: {
  subCategoryId?: string;
  zoneId?: string;
  availableFrom?: Date;
  limit?: number;
}): Promise<ApiResult<PublicProduction[]>> {
  try {
    const conditions = [
      eq(schema.marketOffers.isPublic, true),
      eq(schema.marketOffers.preorderEnabled, true),
    ];
    if (filters?.subCategoryId) {
      conditions.push(eq(schema.marketOffers.subCategoryId, filters.subCategoryId));
    }
    if (filters?.availableFrom) {
      conditions.push(gte(schema.marketOffers.estimatedAvailableAt, filters.availableFrom));
    }

    const offers = await db.query.marketOffers.findMany({
      where: and(...conditions),
      orderBy: [asc(schema.marketOffers.estimatedAvailableAt)],
      limit: Math.min(filters?.limit ?? 50, 100),
      with: {
        subCategory: { columns: { id: true, name: true } },
        farm: { columns: { id: true, name: true, location: true } },
        producer: { columns: { id: true, businessName: true, logoUrl: true, zoneId: true, rating: true } },
      },
    });

    const scoped = filters?.zoneId
      ? offers.filter((o) => o.producer?.zoneId === filters.zoneId)
      : offers;

    return ok(scoped.map(mapToPublicProduction));
  } catch (err) {
    return fail(errorMessage(err));
  }
}

type OfferWithRelations = typeof schema.marketOffers.$inferSelect & {
  subCategory: { id: string; name: string } | null;
  farm: { id: string; name: string; location: string | null } | null;
  producer:
    | { id: string; businessName: string | null; logoUrl: string | null; zoneId: string | null; rating: number | null }
    | null;
};

function mapToPublicProduction(o: OfferWithRelations): PublicProduction {
  return {
    id: o.id,
    productLabel: o.productLabel,
    productionType: (o.productionType as z.infer<typeof productionTypeEnum>) ?? 'CROP',
    estimatedAvailableAt: o.estimatedAvailableAt ?? null,
    expectedHarvestDate: o.expectedHarvestDate ?? null,
    availableQuantity: Number(o.availableQuantity ?? 0),
    reservedQuantity: Number(o.reservedQuantity ?? 0),
    pricePerUnit: o.pricePerUnit != null ? Number(o.pricePerUnit) : null,
    unit: o.unit,
    preorderEnabled: Boolean(o.preorderEnabled),
    species: o.species ?? null,
    breed: o.breed ?? null,
    currentStock: Number(o.currentStock ?? 0),
    subCategory: o.subCategory ? { id: o.subCategory.id, name: o.subCategory.name } : null,
    producer: o.producer
      ? {
          id: o.producer.id,
          businessName: o.producer.businessName ?? null,
          logoUrl: o.producer.logoUrl ?? null,
          zoneId: o.producer.zoneId ?? null,
          rating: o.producer.rating ?? null,
        }
      : null,
    farm: o.farm
      ? { id: o.farm.id, name: o.farm.name, location: o.farm.location ?? null }
      : { id: '', name: '', location: null },
  };
}
