// app/actions/org.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';
import { cookies } from 'next/headers';

export async function selectOrganizationAction(userId: string, organizationId: string) {
  // verify membership or system admin
  const membership = await db.query.userOrganizations.findFirst({
    where: and(eq(schema.userOrganizations.userId, userId), eq(schema.userOrganizations.organizationId, organizationId)),
    with: { dynRole: { columns: { permissions: true } } },
  });

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { role: true } });
  const systemRole = String(user?.role || '').toUpperCase();
  if (!membership && systemRole !== 'SUPERADMIN' && systemRole !== 'ADMIN') {
    return { success: false, error: 'FORBIDDEN' };
  }

  const perms = membership?.dynRole?.permissions || [];
  const roleForCookie = membership?.role ?? (systemRole === 'SUPERADMIN' || systemRole === 'ADMIN' ? 'ADMIN' : 'FIELD_AGENT');

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAMES.ACTIVE_ORG_ID, organizationId, publicOpts());
  cookieStore.set(COOKIE_NAMES.USER_PERMISSIONS, JSON.stringify(perms), publicOpts());
  cookieStore.set(COOKIE_NAMES.USER_ORG, JSON.stringify({ organizationId, role: roleForCookie }), publicOpts());

  return { success: true };
}

export async function updateUserZoneAction(userId: string, zoneId: string) {
  // verify zone exists
  const z = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId), columns: { id: true, name: true } });
  if (!z) return { success: false, error: 'ZONE_NOT_FOUND' };

  await db.update(schema.users).set({ zoneId }).where(eq(schema.users.id, userId));
  return { success: true, zoneId };
}

export async function fetchUserMemberships(userId: string) {
  const memberships = await db.query.userOrganizations.findMany({
    where: eq(schema.userOrganizations.userId, userId),
    with: { organization: { columns: { id: true, name: true, status: true } }, dynRole: { columns: { permissions: true } } },
  });

  const payload = memberships.map(m => ({
    organizationId: m.organizationId,
    organizationName: m.organization?.name || null,
    role: m.role,
    managedZoneId: m.managedZoneId,
    permissions: m.dynRole?.permissions || [],
    status: (m as any).organization?.status ?? 'UNKNOWN',
  }));

  return { success: true, memberships: payload };
}
