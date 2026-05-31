import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';

const productionTypeEnum = z.enum(['CROP', 'LIVESTOCK']);

const DeclareProductionSchema = z.object({
  farmId: z.string().uuid(),
  cropType: z.string().min(1),
  productionType: productionTypeEnum.default('CROP'),
  subCategoryId: z.string().uuid().optional(),
  areaSize: z.number().positive().optional(),
  plantedAt: z.coerce.date().optional(),
  expectedHarvestDate: z.coerce.date().optional(),
  estimatedAvailableAt: z.coerce.date().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().optional(),
  unit: z.string().min(1).default('KG'),
  variety: z.string().min(1).optional(),
  growthStage: z.string().min(1).optional(),
  status: z.string().min(1).default('GROWING'),
  isPublic: z.boolean().default(false),
  preorderEnabled: z.boolean().default(false),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
  initialStock: z.number().nonnegative().optional(),
  currentStock: z.number().nonnegative().optional(),
  hatchDate: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  if (data.productionType === 'CROP') {
    if (data.areaSize == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Superficie requise pour une culture', path: ['areaSize'] });
    }
    if (!data.plantedAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date de semis requise', path: ['plantedAt'] });
    }
    if (!data.expectedHarvestDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date de récolte requise', path: ['expectedHarvestDate'] });
    }
  } else {
    if (!data.species && !data.cropType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Espèce obligatoire pour l’élevage', path: ['species'] });
    }
    if (data.initialStock == null && data.currentStock == null && data.availableQuantity == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stock initial ou disponible requis', path: ['initialStock'] });
    }
  }
});

const UpdateVisibilitySchema = z.object({
  cropCycleId: z.string().uuid(),
  isPublic: z.boolean().optional(),
  preorderEnabled: z.boolean().optional(),
  estimatedAvailableAt: z.coerce.date().nullable().optional(),
  availableQuantity: z.number().nonnegative().optional(),
  pricePerUnit: z.number().positive().nullable().optional(),
  growthStage: z.string().min(1).nullable().optional(),
  status: z.string().min(1).optional(),
  currentStock: z.number().nonnegative().optional(),
  species: z.string().min(1).optional(),
  breed: z.string().min(1).optional(),
});

export type DeclareProductionInput = z.input<typeof DeclareProductionSchema>;
export type UpdateVisibilityInput = z.input<typeof UpdateVisibilitySchema>;

export type PublicProduction = {
  id: string;
  cropType: string;
  productionType: z.infer<typeof productionTypeEnum>;
  variety: string | null;
  growthStage: string | null;
  estimatedAvailableAt: Date | null;
  availableQuantity: number;
  reservedQuantity: number;
  pricePerUnit: number | null;
  unit: string;
  preorderEnabled: boolean;
  species: string | null;
  breed: string | null;
  initialStock: number;
  currentStock: number;
  hatchDate: Date | null;
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

    const areaSizeValue = data.productionType === 'CROP' ? (data.areaSize ?? 0) : 0;
    const plantedAtValue = data.productionType === 'CROP' ? (data.plantedAt ?? new Date()) : new Date();
    const harvestValue = data.productionType === 'CROP' ? (data.expectedHarvestDate ?? new Date()) : new Date();

    const [created] = await db
      .insert(schema.cropCycles)
      .values({ 
        farmId: data.farmId,
        cropType: data.cropType,
        productionType: data.productionType,
        subCategoryId: data.subCategoryId ?? null,
        areaSize: areaSizeValue,
        plantedAt: plantedAtValue,
        expectedHarvestDate: harvestValue,
        estimatedAvailableAt: data.estimatedAvailableAt ?? null,
        availableQuantity: data.availableQuantity ?? 0,
        pricePerUnit: data.pricePerUnit ?? null,
        unit: data.unit,
        variety: data.variety ?? null,
        growthStage: data.growthStage ?? null,
        status: data.status,
        isPublic: data.isPublic,
        preorderEnabled: data.preorderEnabled,
        species: data.species ?? null,
        breed: data.breed ?? null,
        initialStock: data.initialStock ?? 0,
        currentStock: data.currentStock ?? data.initialStock ?? 0,
        hatchDate: data.hatchDate ?? null,
      } satisfies typeof schema.cropCycles.$inferInsert)
      .returning({ id: schema.cropCycles.id });

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

    const cycle = await db.query.cropCycles.findFirst({
      where: eq(schema.cropCycles.id, data.cropCycleId),
      columns: { id: true, farmId: true, reservedQuantity: true, availableQuantity: true },
      with: { farm: { columns: { producerId: true } } },
    });
    if (!cycle) return fail('CYCLE_NOT_FOUND');
    if (cycle.farm?.producerId !== producerId) return fail('FORBIDDEN');

    const patch: Partial<typeof schema.cropCycles.$inferInsert> = {};
    if (data.isPublic !== undefined) patch.isPublic = data.isPublic;
    if (data.preorderEnabled !== undefined) patch.preorderEnabled = data.preorderEnabled;
    if (data.estimatedAvailableAt !== undefined) patch.estimatedAvailableAt = data.estimatedAvailableAt;
    if (data.availableQuantity !== undefined) {
      if (data.availableQuantity < (cycle.reservedQuantity ?? 0)) {
        return fail('AVAILABLE_LT_RESERVED');
      }
      patch.availableQuantity = data.availableQuantity;
    }
    if (data.pricePerUnit !== undefined) patch.pricePerUnit = data.pricePerUnit;
    if (data.growthStage !== undefined) patch.growthStage = data.growthStage;
    if (data.status !== undefined) patch.status = data.status;
    if (data.currentStock !== undefined) patch.currentStock = data.currentStock;
    if (data.species !== undefined) patch.species = data.species;
    if (data.breed !== undefined) patch.breed = data.breed;

    if (Object.keys(patch).length === 0) return ok({ id: cycle.id });

    await db.update(schema.cropCycles).set(patch).where(eq(schema.cropCycles.id, cycle.id));
    return ok({ id: cycle.id });
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function getProducerProductions(producerId: string): Promise<ApiResult<PublicProduction[]>> {
  try {
    if (!producerId) return fail('PRODUCER_REQUIRED');

    const farms = await db.query.farms.findMany({
      where: eq(schema.farms.producerId, producerId),
      columns: { id: true },
    });
    const farmIds = farms.map((f) => f.id);
    if (farmIds.length === 0) return ok([]);

    const cycles = await db.query.cropCycles.findMany({
      where: inArray(schema.cropCycles.farmId, farmIds),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      with: {
        subCategory: { columns: { id: true, name: true } },
        farm: {
          columns: { id: true, name: true, location: true },
          with: {
            producer: { columns: { id: true, businessName: true, logoUrl: true, zoneId: true, rating: true } },
          },
        },
      },
    });

    return ok(cycles.map(mapToPublicProduction));
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
      eq(schema.cropCycles.isPublic, true),
      eq(schema.cropCycles.preorderEnabled, true),
    ];
    if (filters?.subCategoryId) {
      conditions.push(eq(schema.cropCycles.subCategoryId, filters.subCategoryId));
    }
    if (filters?.availableFrom) {
      conditions.push(gte(schema.cropCycles.estimatedAvailableAt, filters.availableFrom));
    }

    const cycles = await db.query.cropCycles.findMany({
      where: and(...conditions),
      orderBy: [asc(schema.cropCycles.estimatedAvailableAt)],
      limit: Math.min(filters?.limit ?? 50, 100),
      with: {
        subCategory: { columns: { id: true, name: true } },
        farm: {
          columns: { id: true, name: true, location: true },
          with: {
            producer: { columns: { id: true, businessName: true, logoUrl: true, zoneId: true, rating: true } },
          },
        },
      },
    });

    const scoped = filters?.zoneId
      ? cycles.filter((c) => c.farm?.producer?.zoneId === filters.zoneId)
      : cycles;

    return ok(scoped.map(mapToPublicProduction));
  } catch (err) {
    return fail(errorMessage(err));
  }
}

type CycleWithRelations = typeof schema.cropCycles.$inferSelect & {
  subCategory: { id: string; name: string } | null;
  farm:
    | {
        id: string;
        name: string;
        location: string | null;
        producer:
          | { id: string; businessName: string | null; logoUrl: string | null; zoneId: string | null; rating: number | null }
          | null;
      }
    | null;
};

function mapToPublicProduction(c: CycleWithRelations): PublicProduction {
  return {
    id: c.id,
    cropType: c.cropType,
    productionType: (c.productionType as z.infer<typeof productionTypeEnum>) ?? 'CROP',
    variety: c.variety ?? null,
    growthStage: c.growthStage ?? null,
    estimatedAvailableAt: c.estimatedAvailableAt ?? null,
    availableQuantity: c.availableQuantity,
    reservedQuantity: c.reservedQuantity,
    pricePerUnit: c.pricePerUnit ?? null,
    unit: c.unit,
    preorderEnabled: Boolean(c.preorderEnabled),
    species: c.species ?? null,
    breed: c.breed ?? null,
    initialStock: c.initialStock ?? 0,
    currentStock: c.currentStock ?? 0,
    hatchDate: c.hatchDate ?? null,
    subCategory: c.subCategory ? { id: c.subCategory.id, name: c.subCategory.name } : null,
    producer: c.farm?.producer
      ? {
          id: c.farm.producer.id,
          businessName: c.farm.producer.businessName ?? null,
          logoUrl: c.farm.producer.logoUrl ?? null,
          zoneId: c.farm.producer.zoneId ?? null,
          rating: c.farm.producer.rating ?? null,
        }
      : null,
    farm: c.farm
      ? { id: c.farm.id, name: c.farm.name, location: c.farm.location ?? null }
      : { id: '', name: '', location: null },
  };
}
