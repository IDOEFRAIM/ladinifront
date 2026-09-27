import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { DeclareProductionSchema, UpdateVisibilitySchema, DeclareProductionInput, UpdateVisibilityInput } from '@/features/production/services/production.schemas';
import { assertFarmOwnership } from '@/features/production/services/production-helpers';

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
