import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { productionTypeEnum, PublicProduction } from '@/features/production/services/production.schemas';

export async function assertFarmOwnership(producerId: string, farmId: string): Promise<boolean> {
  const farm = await db.query.farms.findFirst({
    where: and(eq(schema.farms.id, farmId), eq(schema.farms.producerId, producerId)),
    columns: { id: true },
  });
  return Boolean(farm);
}

export type OfferWithRelations = typeof schema.marketOffers.$inferSelect & {
  subCategory: { id: string; name: string } | null;
  farm: { id: string; name: string; location: string | null } | null;
  producer:
    | { id: string; businessName: string | null; logoUrl: string | null; zoneId: string | null; rating: number | null }
    | null;
};

export function mapToPublicProduction(o: OfferWithRelations): PublicProduction {
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
