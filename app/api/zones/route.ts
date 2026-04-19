import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { asc } from 'drizzle-orm';

export async function GET() {
  try {
    const zones = await db.select({ id: schema.zones.id, name: schema.zones.name }).from(schema.zones).orderBy(asc(schema.zones.name));
    return NextResponse.json(zones);
  } catch (e) {
    console.error('api/zones GET error', e);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
