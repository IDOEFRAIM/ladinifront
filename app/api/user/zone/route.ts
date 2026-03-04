import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

    const body = await req.json();
    const zoneId = body?.zoneId;
    if (!zoneId) return NextResponse.json({ error: 'zoneId requis' }, { status: 400 });

    // verify zone exists
    const z = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId), columns: { id: true, name: true } });
    if (!z) return NextResponse.json({ error: 'Zone introuvable' }, { status: 404 });

    await db.update(schema.users).set({ zoneId }).where(eq(schema.users.id, session.userId));

    return NextResponse.json({ ok: true, zoneId });
  } catch (err: any) {
    console.error('[api/user/zone] error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
