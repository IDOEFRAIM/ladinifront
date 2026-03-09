import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { buildAccessContext } from '@/lib/access-context';

export async function fetchMeServer(userId: string) {
  if (!userId) throw new Error('USER_NOT_FOUND');

  const ctx = await buildAccessContext(userId);

  const userProfile = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { name: true, email: true },
  });

  if (!userProfile) throw new Error('USER_NOT_FOUND');

  const orgIds = (ctx.orgScopes || []).map((o: any) => o.organizationId);
  const orgs = orgIds.length > 0
    ? await db.query.organizations.findMany({
        where: inArray(schema.organizations.id, orgIds),
        columns: { id: true, name: true },
      })
    : [];

  const orgNameById: Record<string, string> = {};
  for (const o of orgs) orgNameById[o.id] = o.name;

  const payload = {
    id: userId,
    name: userProfile.name,
    email: userProfile.email,
    role: ctx.role,
    producerId: ctx.producerId || null,
    organizations: (ctx.orgScopes || []).map((o: any) => ({
      organizationId: o.organizationId,
      role: o.orgRole,
      name: orgNameById[o.organizationId] || 'Organisation inconnue'
    })),
    permissions: Array.from(ctx.permissions || []),
    permissionVersion: ctx.permissionVersion,
  };

  return { success: true, user: payload };
}

export default { fetchMeServer };
