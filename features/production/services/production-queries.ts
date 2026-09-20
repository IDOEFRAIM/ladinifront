import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, asc, eq, gte } from 'drizzle-orm';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { PublicProduction } from '@/features/production/services/production.schemas';
import { mapToPublicProduction } from '@/features/production/services/production-helpers';

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
