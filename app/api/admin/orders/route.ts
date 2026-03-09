import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export async function GET(req: Request) {
  try {
    // Minimal: return recent orders
    const orders = await db.select().from(schema.orders).orderBy(schema.orders.createdAt.desc).limit(200);
    return NextResponse.json(orders);
  } catch (e) {
    console.error('api/admin/orders GET error', e);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
