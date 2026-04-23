// app/actions/productor.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function updateProducerSettings(userId: string, producerId: string, data: { name?: string; email?: string; phone?: string; location?: string; whatsappEnabled?: boolean; dailyAdviceTime?: string; latitude?: number; longitude?: number; cnibNumber?: string }) {
  // Update user contact info and profile fields
  await db.update(schema.users).set({
    name: data.name ?? undefined,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    whatsappEnabled: data.whatsappEnabled ?? undefined,
    dailyAdviceTime: data.dailyAdviceTime ?? undefined,
    latitude: data.latitude ?? undefined,
    longitude: data.longitude ?? undefined,
    cnibNumber: data.cnibNumber ?? undefined,
  }).where(eq(schema.users.id, userId));

  // Update producer business info
  const [updated] = await db.update(schema.producers).set({ businessName: data.name ?? undefined, region: data.location ?? undefined }).where(eq(schema.producers.id, producerId)).returning();
  return updated;
}
