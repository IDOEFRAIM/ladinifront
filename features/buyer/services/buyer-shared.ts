import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Résout l'ID profil acheteur à partir du userId de session.
 */
export async function getProfileIdOrThrow(userId: string): Promise<string | null> {
  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
    columns: { id: true },
  });
  return profile?.id ?? null;
}
