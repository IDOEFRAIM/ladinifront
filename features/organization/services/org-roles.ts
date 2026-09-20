// Organisation — rôles dynamiques (permissions).
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { audit, snapshot } from '@/lib/audit';
import { isValidPermission } from '@/lib/permissions';
import { CreateRoleDefSchema, UpdateRoleDefSchema } from '@/lib/validators';
import { ServiceResult, requireOrgAdmin, requireOrgManager } from './org-context';
import { asError } from '@/lib/errors';

/**
 * Liste les RoleDef disponibles (utilisés pour l'assignation aux membres).
 */
export async function getOrgRoles(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const roles = await db.query.roleDefs.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // Single GROUP BY query instead of N+1
    const roleCounts = await db.select({
      roleId: schema.userOrganizations.roleId,
      value: count(),
    })
      .from(schema.userOrganizations)
      .where(sql`${schema.userOrganizations.roleId} IS NOT NULL`)
      .groupBy(schema.userOrganizations.roleId);
    const countMap = Object.fromEntries(roleCounts.map(rc => [rc.roleId!, rc.value]));

    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      membersCount: countMap[r.id] ?? 0,
      createdAt: r.createdAt.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (err) {
    console.error('[OrgManager] getOrgRoles:', err);
    return { success: false, error: 'Impossible de charger les rôles.' };
  }
}

/**
 * Crée un nouveau RoleDef. Réservé aux ADMIN.
 */
export async function createOrgRole(data: {
  name: string;
  description?: string | null;
  permissions: string[];
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  const validation = CreateRoleDefSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  // Validate all permissions against registry
  const invalidPerms = validation.data.permissions.filter(p => !isValidPermission(p));
  if (invalidPerms.length > 0) {
    return { success: false, error: `Permissions invalides : ${invalidPerms.join(', ')}` };
  }

  try {
    const [role] = await db.insert(schema.roleDefs).values({
      name: validation.data.name,
      description: validation.data.description ?? null,
      permissions: validation.data.permissions,
    }).returning();

    await audit({
      actorId: ctx.userId,
      action: 'CREATE_ROLE_DEF',
      entityId: role.id,
      entityType: 'RoleDef',
      newValue: { name: role.name, permissions: role.permissions },
    });

    return { success: true, data: role };
  } catch (_err: unknown) {
    const err = asError(_err);
    if (err?.code === '23505') {
      return { success: false, error: 'Un rôle avec ce nom existe déjà.' };
    }
    console.error('[OrgManager] createOrgRole:', err);
    return { success: false, error: 'Impossible de créer le rôle.' };
  }
}

/**
 * Met à jour un RoleDef existant. Réservé aux ADMIN.
 */
export async function updateOrgRole(roleId: string, data: {
  name?: string;
  description?: string | null;
  permissions?: string[];
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!roleId) return { success: false, error: 'ID du rôle requis.' };

  const validation = UpdateRoleDefSchema.safeParse({ ...data, id: roleId });
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  if (validation.data.permissions) {
    const invalidPerms = validation.data.permissions.filter(p => !isValidPermission(p));
    if (invalidPerms.length > 0) {
      return { success: false, error: `Permissions invalides : ${invalidPerms.join(', ')}` };
    }
  }

  try {
    const oldRole = await db.query.roleDefs.findFirst({ where: eq(schema.roleDefs.id, roleId) });
    if (!oldRole) return { success: false, error: 'Rôle introuvable.' };
    const oldValue = await snapshot(oldRole as unknown as Record<string, unknown>);

    const updateData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.permissions !== undefined) updateData.permissions = validation.data.permissions;

    const [updated] = await db.update(schema.roleDefs)
      .set(updateData as any)
      .where(eq(schema.roleDefs.id, roleId))
      .returning();

    await audit({
      actorId: ctx.userId,
      action: 'UPDATE_ROLE_DEF',
      entityId: roleId,
      entityType: 'RoleDef',
      oldValue,
      newValue: { name: updated.name, permissions: updated.permissions },
    });

    return { success: true, data: updated };
  } catch (_err: unknown) {
    const err = asError(_err);
    if (err?.code === '23505') {
      return { success: false, error: 'Un rôle avec ce nom existe déjà.' };
    }
    console.error('[OrgManager] updateOrgRole:', err);
    return { success: false, error: 'Impossible de mettre à jour le rôle.' };
  }
}

/**
 * Supprime un RoleDef. Réservé aux ADMIN. Refuse si des membres l'utilisent.
 */
export async function deleteOrgRole(roleId: string): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!roleId) return { success: false, error: 'ID du rôle requis.' };

  try {
    const role = await db.query.roleDefs.findFirst({
      where: eq(schema.roleDefs.id, roleId),
    });
    if (!role) return { success: false, error: 'Rôle introuvable.' };

    // Count members using this role
    const [{ value: userOrgsCount }] = await db.select({ value: count() })
      .from(schema.userOrganizations)
      .where(eq(schema.userOrganizations.roleId, roleId));

    if (userOrgsCount > 0) {
      return { success: false, error: `Impossible de supprimer : ${userOrgsCount} membre(s) utilisent ce rôle.` };
    }

    const oldValue = await snapshot(role as unknown as Record<string, unknown>);
    await db.delete(schema.roleDefs).where(eq(schema.roleDefs.id, roleId));

    await audit({
      actorId: ctx.userId,
      action: 'DELETE_ROLE_DEF',
      entityId: roleId,
      entityType: 'RoleDef',
      oldValue,
    });

    return { success: true };
  } catch (err) {
    console.error('[OrgManager] deleteOrgRole:', err);
    return { success: false, error: 'Impossible de supprimer le rôle.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  MEMBERS (UserOrganization management)       ║
// ╚══════════════════════════════════════════════╝
