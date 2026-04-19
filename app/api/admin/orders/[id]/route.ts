import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[parts.indexOf('orders') + 1];
    const body = await req.json();
    const status = body.status;
    if (!status) return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    await db.update(schema.orders).set({ status }).where(eq(schema.orders.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('api/admin/orders/[id] PATCH error', e);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
