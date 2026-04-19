import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const zoneId = url.searchParams.get('zoneId');
    const status = url.searchParams.get('status');

    let query = db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(200).$dynamic();

    const conditions = [];
    if (zoneId) conditions.push(eq(schema.orders.zoneId, zoneId));
    if (status) conditions.push(eq(schema.orders.status, status));

    if (conditions.length === 1) {
      query = query.where(conditions[0]);
    } else if (conditions.length > 1) {
      query = query.where(and(...conditions));
    }

    const orders = await query;
    return NextResponse.json(orders);
  } catch (e) {
    console.error('api/admin/orders GET error', e);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
