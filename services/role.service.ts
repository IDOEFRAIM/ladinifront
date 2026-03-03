'use server';

import { prisma } from '@/lib/prisma';

/**
 * Server-side RoleDef / Permission helpers
 * - getUserPermissions(userId): aggregate dynRole.permissions across org memberships
 * - userHasPermission(userId, permission, organizationId?): boolean
 * - userHasAnyPermission(userId, permissions[], organizationId?): boolean
 */

export async function getUserPermissions(userId: string) {
  const memberships = await prisma.userOrganization.findMany({
    where: { userId },
    select: { dynRole: { select: { permissions: true } } },
  });
  const set = new Set<string>();
  memberships.forEach((m: any) => {
    (m.dynRole?.permissions || []).forEach((p: string) => set.add(p));
  });
  return Array.from(set);
}

export async function userHasPermission(userId: string, permission: string, organizationId?: string) {
  // Check system role first
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return false;
  const roleUpper = (user.role || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') return true;

  // If organizationId provided, verify membership exists
  const where: any = { userId };
  if (organizationId) where.organizationId = organizationId;

  const membership = await prisma.userOrganization.findFirst({
    where,
    select: { dynRole: { select: { permissions: true } } },
  });
  if (!membership) return false;
  const perms = membership.dynRole?.permissions || [];
  return perms.includes(permission);
}

export async function userHasAnyPermission(userId: string, permissions: string[], organizationId?: string) {
  if (!permissions || permissions.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return false;
  const roleUpper = (user.role || '').toString().toUpperCase();
  if (roleUpper === 'ADMIN' || roleUpper === 'SUPERADMIN') return true;

  const where: any = { userId };
  if (organizationId) where.organizationId = organizationId;

  const memberships = await prisma.userOrganization.findMany({
    where,
    select: { dynRole: { select: { permissions: true } } },
  });

  const set = new Set<string>();
  memberships.forEach((m: any) => (m.dynRole?.permissions || []).forEach((p: string) => set.add(p)));

  return permissions.some(p => set.has(p));
}
