'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

type DbLike = {
  query: typeof db.query;
  insert: typeof db.insert;
};

/**
 * Resolve an order buyer profile id.
 * - Accepts either a buyerProfileId (preferred) or a userId (legacy callers).
 * - Creates a minimal buyer profile when missing.
 */
export async function resolveBuyerProfileId(
  inputBuyerId?: string | null,
  opts?: { tx?: DbLike },
): Promise<string | null> {
  const client = opts?.tx ?? db;
  const input = inputBuyerId ?? null;
  if (!input) return null;

  // 1) If caller already passed a buyerProfile.id
  const byId = await client.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.id, input),
    columns: { id: true },
  });
  if (byId?.id) return byId.id;

  // 2) Legacy: caller passed a userId (auth.users.id)
  const byUser = await client.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, input),
    columns: { id: true },
  });
  if (byUser?.id) return byUser.id;

  // 3) Create minimal profile (buyerTypeId can be assigned later by admin/onboarding)
  const [created] = await client
    .insert(schema.buyerProfiles)
    .values({
      userId: input,
      buyerTypeId: null,
      establishmentName: null,
      defaultDeliveryAddress: null,
      isVerified: false,
    })
    .returning({ id: schema.buyerProfiles.id });

  return created?.id ?? null;
}

export async function getBuyerProfileByUserId(userId: string) {
  return db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
  });
}
