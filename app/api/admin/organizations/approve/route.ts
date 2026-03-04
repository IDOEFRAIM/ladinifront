import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { audit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
    if (error) return error;
    if (!ctx) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

    const body = await req.json();
    const { organizationId } = body || {};
    if (!organizationId) return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });

    const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, organizationId) });
    if (!org) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const [updated] = await db.update(schema.organizations).set({ status: 'ACTIVE' }).where(eq(schema.organizations.id, organizationId)).returning();

    await audit({ actorId: ctx.userId, action: 'ORG_APPROVED', entityId: organizationId, entityType: 'Organization', newValue: { status: 'ACTIVE' } });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[API] admin/organizations/approve error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
