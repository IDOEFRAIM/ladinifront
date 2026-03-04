import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const memberships = await db.query.userOrganizations.findMany({
    where: eq(schema.userOrganizations.userId, session.userId),
    with: {
      organization: { columns: { id: true, name: true, status: true } },
      dynRole: { columns: { permissions: true } },
    },
  });

  const payload = memberships.map(m => ({
    organizationId: m.organizationId,
    organizationName: m.organization?.name || null,
    role: m.role,
    managedZoneId: m.managedZoneId,
    permissions: m.dynRole?.permissions || [],
    status: (m as any).organization?.status ?? 'UNKNOWN'
  }));

  return NextResponse.json({ success: true, memberships: payload });
}
