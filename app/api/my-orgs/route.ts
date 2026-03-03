import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  // Try to include organization.status if the DB has that column, fall back if not present
  let memberships;
  try {
    memberships = await prisma.userOrganization.findMany({
      where: { userId: session.userId },
      include: {
        organization: { select: { id: true, name: true, status: true } as any },
        dynRole: { select: { permissions: true } },
      },
    });
  } catch (e: any) {
    console.warn('[api/my-orgs] could not select organization.status, falling back', e?.message || e);
    memberships = await prisma.userOrganization.findMany({
      where: { userId: session.userId },
      include: {
        organization: { select: { id: true, name: true } },
        dynRole: { select: { permissions: true } },
      },
    });
  }

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
