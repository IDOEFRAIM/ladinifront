// app/actions/admin.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { desc, eq, and } from 'drizzle-orm';
import { count, avg, sum } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { getAdminDashboardStats } from '@/services/admin.service';
import { createOrganization as createOrgService } from '@/services/org-manager.service';

export async function fetchOrganizations() {
  const orgs = await db
    .select({ id: schema.organizations.id, name: schema.organizations.name, type: schema.organizations.type, createdAt: schema.organizations.createdAt, status: schema.organizations.status })
    .from(schema.organizations)
    .orderBy(desc(schema.organizations.createdAt));
  return orgs;
}

export async function approveOrganization(organizationId: string, actorId?: string) {
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, organizationId) });
  if (!org) throw new Error('NOT_FOUND');
  const [updated] = await db.update(schema.organizations).set({ status: 'ACTIVE' }).where(eq(schema.organizations.id, organizationId)).returning();
  if (actorId) {
    await audit({ actorId, action: 'ORG_APPROVED', entityId: organizationId, entityType: 'Organization', newValue: { status: 'ACTIVE' } });
  }
  return updated;
}

export async function getAdminUser(userId: string) {
  const dbUser = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, name: true, role: true } });
  return dbUser;
}

export async function updateUserRole(targetUserId: string, role: string) {
  const [updated] = await db.update(schema.users).set({ role: role as any }).where(eq(schema.users.id, targetUserId)).returning();
  return updated;
}

export async function fetchAdminMetrics() {
  const res = await getAdminDashboardStats();
  return res;
}

export async function createOrganization(data: { name: string; type: string; taxId?: string | null; description?: string | null; }) {
  const res = await createOrgService(data as any);
  return res;
}
