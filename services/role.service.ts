'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Server-side RoleDef / Permission helpers
 * - getUserPermissions(userId): aggregate dynRole.permissions across org memberships
 * - userHasPermission(userId, permission, organizationId?): boolean
 * - userHasAnyPermission(userId, permissions[], organizationId?): boolean
 */

export async function getUserPermissions(userId: string) {
  const memberships = await db.query.userOrganizations.findMany({
    where: eq(schema.userOrganizations.userId, userId),
    with: { dynRole: { columns: { permissions: true } } },
  });
  const set = new Set<string>();
  memberships.forEach((m: any) => {
    (m.dynRole?.permissions || []).forEach((p: string) => set.add(p));
  });
  return Array.from(set);
}

export async function userHasPermission(userId: string, permission: string, organizationId?: string) {
  // Check system role first
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { role: true },
  });
  if (!user) return false;
  const roleUpper = (user.role || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') return true;

  // If organizationId provided, verify membership exists
  const conditions = [eq(schema.userOrganizations.userId, userId)];
  if (organizationId) conditions.push(eq(schema.userOrganizations.organizationId, organizationId));

  const membership = await db.query.userOrganizations.findFirst({
    where: and(...conditions),
    with: { dynRole: { columns: { permissions: true } } },
  });
  if (!membership) return false;
  const perms = membership.dynRole?.permissions || [];
  return perms.includes(permission);
}

export async function userHasAnyPermission(userId: string, permissions: string[], organizationId?: string) {
  if (!permissions || permissions.length === 0) return false;
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { role: true },
  });
  if (!user) return false;
  const roleUpper = (user.role || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') return true;

  const conditions = [eq(schema.userOrganizations.userId, userId)];
  if (organizationId) conditions.push(eq(schema.userOrganizations.organizationId, organizationId));

  const memberships = await db.query.userOrganizations.findMany({
    where: and(...conditions),
    with: { dynRole: { columns: { permissions: true } } },
  });

  const set = new Set<string>();
  memberships.forEach((m: any) => (m.dynRole?.permissions || []).forEach((p: string) => set.add(p)));

  return permissions.some(p => set.has(p));
}
