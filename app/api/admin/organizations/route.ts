import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await getAccessContext(undefined, ['ORGANIZATION_MANAGE']);
    if (error) return error;

    const orgs = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        type: schema.organizations.type,
        createdAt: schema.organizations.createdAt,
        status: schema.organizations.status,
      })
      .from(schema.organizations)
      .orderBy(desc(schema.organizations.createdAt));

    return NextResponse.json({ success: true, data: orgs });
  } catch (err) {
    console.error('[API] admin/organizations GET error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
