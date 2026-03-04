import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';

export async function POST(req: Request) {
  const { user, error } = await requireProducer();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { producerId, name, email, phone, location } = body;

    if (!producerId || producerId !== (user.producerId || user.id)) {
      return NextResponse.json({ error: 'Invalid producer' }, { status: 403 });
    }

    // Update user contact info
    await db.update(schema.users).set({ name: name ?? undefined, email: email ?? undefined, phone: phone ?? undefined }).where(eq(schema.users.id, user.id));

    // Update producer business info (store location in region for now)
    const [updated] = await db.update(schema.producers).set({ businessName: name ?? undefined, region: location ?? undefined }).where(eq(schema.producers.id, producerId)).returning();

    return NextResponse.json({ ok: true, producer: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
