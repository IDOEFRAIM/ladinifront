'use server';

import { getAccessContext } from '@/lib/api-guard';
import { fail, type ApiResult } from '@/lib/api-result';
import {
  createPreorder,
  getBuyerPreorders,
  updatePreorderQuantity,
  cancelPreorder,
  type CreatePreorderInput,
  type UpdatePreorderInput,
  type CancelPreorderInput,
  type BuyerPreorder,
} from '@/services/preorder.service';

export async function createPreorderAction(
  input: CreatePreorderInput,
): Promise<ApiResult<{ orderId: string }>> {
  const { ctx } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (!ctx) return fail('AUTH_REQUIRED');
  return createPreorder(ctx.userId, input);
}

export async function getBuyerPreordersAction(): Promise<ApiResult<BuyerPreorder[]>> {
  const { ctx } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (!ctx) return fail('AUTH_REQUIRED');
  return getBuyerPreorders(ctx.userId);
}

export async function updatePreorderAction(
  input: UpdatePreorderInput,
): Promise<ApiResult<{ quantity: number }>> {
  const { ctx } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (!ctx) return fail('AUTH_REQUIRED');
  return updatePreorderQuantity(ctx.userId, input);
}

export async function cancelPreorderAction(
  input: CancelPreorderInput,
): Promise<ApiResult<{ cancelled: boolean }>> {
  const { ctx } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (!ctx) return fail('AUTH_REQUIRED');
  return cancelPreorder(ctx.userId, input);
}
