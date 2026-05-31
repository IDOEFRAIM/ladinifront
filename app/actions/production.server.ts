'use server';

import { getAccessContext } from '@/lib/api-guard';
import { fail, type ApiResult } from '@/lib/api-result';
import {
  declareFutureProduction,
  updateProductionVisibility,
  getProducerProductions,
  getPublicFutureProductions,
  type DeclareProductionInput,
  type UpdateVisibilityInput,
  type PublicProduction,
} from '@/services/production.service';

async function requireProducerId(): Promise<{ producerId: string | null; error: string | null }> {
  const { ctx } = await getAccessContext(['PRODUCER', 'ADMIN', 'SUPERADMIN']);
  if (!ctx) return { producerId: null, error: 'AUTH_REQUIRED' };
  if (!ctx.producerId) return { producerId: null, error: 'PRODUCER_PROFILE_REQUIRED' };
  return { producerId: ctx.producerId, error: null };
}

export async function declareProductionAction(
  input: DeclareProductionInput,
): Promise<ApiResult<{ id: string }>> {
  const { producerId, error } = await requireProducerId();
  if (error || !producerId) return fail(error ?? 'AUTH_REQUIRED');
  return declareFutureProduction(producerId, input);
}

export async function updateProductionVisibilityAction(
  input: UpdateVisibilityInput,
): Promise<ApiResult<{ id: string }>> {
  const { producerId, error } = await requireProducerId();
  if (error || !producerId) return fail(error ?? 'AUTH_REQUIRED');
  return updateProductionVisibility(producerId, input);
}

export async function getProducerProductionsAction(): Promise<ApiResult<PublicProduction[]>> {
  const { producerId, error } = await requireProducerId();
  if (error || !producerId) return fail(error ?? 'AUTH_REQUIRED');
  return getProducerProductions(producerId);
}

export async function getPublicFutureProductionsAction(filters?: {
  subCategoryId?: string;
  zoneId?: string;
  availableFrom?: string;
  limit?: number;
}): Promise<ApiResult<PublicProduction[]>> {
  return getPublicFutureProductions({
    subCategoryId: filters?.subCategoryId,
    zoneId: filters?.zoneId,
    availableFrom: filters?.availableFrom ? new Date(filters.availableFrom) : undefined,
    limit: filters?.limit,
  });
}
