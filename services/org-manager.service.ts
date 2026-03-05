/**
 * ORG-MANAGER SERVICE — AgriConnect v2
 * ──────────────────────────────────────────────────────────────────────────
 * Server actions pour la gestion multi-tenant d'une organisation.
 *
 * Sécurité :
 *  1. Chaque action lit `active-org-id` et `session-token` depuis les cookies.
 *  2. La membership est vérifiée en DB (jamais de confiance au client).
 *  3. Seul un ADMIN (org-level) ou SUPERADMIN/ADMIN (système) peut muter.
 *  4. Chaque mutation génère une entrée dans AuditLog.
 */
'use server';

import { cookies } from 'next/headers';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or, count } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { audit, snapshot } from '@/lib/audit';
import { isValidPermission } from '@/lib/permissions';
import {
  UpdateOrgSettingsSchema,
  CreateOrgSchema,
  CreateRoleDefSchema,
  UpdateRoleDefSchema,
  InviteMemberSchema,
  UpdateMemberSchema,
  AssignWorkZoneSchema,
  UpdateWorkZoneSchema,
} from '@/lib/validators';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrgContext {
  userId: string;
  orgId: string;
  orgRole: string;       // OrgRole enum value from UserOrganization
  systemRole: string;    // Role enum value from User
  isOrgAdmin: boolean;   // true if orgRole === 'ADMIN' or systemRole in [ADMIN, SUPERADMIN]
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts org context from cookies + verifies membership in DB.
 * Returns null with error message if any check fails.
 */
async function getOrgContext(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const cookieStore = await cookies();

  // 1. JWT session
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  const userId = session?.userId;
  if (!userId) {
    return { ctx: null, error: 'Session expirée. Reconnectez-vous.' };
  }

  // 2. Active org cookie
  let orgId = cookieStore.get(COOKIE_NAMES.ACTIVE_ORG_ID)?.value;
  // Fallback: session token may carry activeOrgId
  if (!orgId) {
    const session = await getSessionFromRequest({ cookies: cookieStore } as any);
    if (session?.activeOrgId) {
      orgId = session.activeOrgId;
        if (process.env.NODE_ENV !== 'production') console.log(`getOrgContext: using activeOrgId from session=${orgId}`);
    }
  }
  // Fallback: client may cache the first org in `user-org` cookie
  if (!orgId) {
    const userOrgRaw = cookieStore.get(COOKIE_NAMES.USER_ORG)?.value;
    if (userOrgRaw) {
      try {
        const parsed = JSON.parse(userOrgRaw);
        if (parsed && parsed.organizationId) {
          orgId = String(parsed.organizationId);
          if (process.env.NODE_ENV !== 'production') console.log(`getOrgContext: using organizationId from user-org cookie=${orgId}`);
        }
      } catch (e) {
        // ignore malformed cookie
      }
    }
  }

  if (!orgId) {
    return { ctx: null, error: 'Aucune organisation active. Sélectionnez une organisation.' };
  }

  // 3. Verify membership in DB (NEVER trust client)
  const [membership, user] = await Promise.all([
    db.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, userId),
        eq(schema.userOrganizations.organizationId, orgId),
      ),
    }),
    db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { role: true },
    }),
  ]);

  if (!user) {
    return { ctx: null, error: 'Utilisateur introuvable.' };
  }

  const systemRole = String(user.role).toUpperCase();
  const isSystemAdmin = systemRole === 'SUPERADMIN' || systemRole === 'ADMIN';

  // System admins can access any org even without membership
  if (!membership && !isSystemAdmin) {
    return { ctx: null, error: 'Vous n\'appartenez pas à cette organisation.' };
  }

  const orgRole = membership?.role ? String(membership.role) : 'FIELD_AGENT';
  const isOrgAdmin = orgRole === 'ADMIN' || isSystemAdmin;

  return {
    ctx: { userId, orgId, orgRole, systemRole, isOrgAdmin },
    error: null,
  };
}

/**
 * Guard: requires org ADMIN (or system ADMIN/SUPERADMIN).
 */
async function requireOrgAdmin(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const { ctx, error } = await getOrgContext();
  if (error || !ctx) return { ctx: null, error: error || 'Accès refusé.' };

  if (!ctx.isOrgAdmin) {
    return { ctx: null, error: 'Seul un administrateur de l\'organisation peut effectuer cette action.' };
  }

  return { ctx, error: null };
}

/**
 * Guard: requires at least ADMIN or ZONE_MANAGER in org (or system admin).
 */
async function requireOrgManager(): Promise<{ ctx: OrgContext | null; error: string | null }> {
  const { ctx, error } = await getOrgContext();
  if (error || !ctx) return { ctx: null, error: error || 'Accès refusé.' };

  const allowedRoles = ['ADMIN', 'ZONE_MANAGER'];
  if (!allowedRoles.includes(ctx.orgRole) && !ctx.isOrgAdmin) {
    return { ctx: null, error: 'Droits insuffisants pour cette action.' };
  }

  return { ctx, error: null };
}


/**
 * CREATE ORGANIZATION (system admin only)
 * Creates an Organization and assigns the creator as org ADMIN.
 */
export async function createOrganization(data: {
  name: string;
  type: string;
  taxId?: string | null;
  description?: string | null;
}): Promise<ServiceResult> {
  // Validate input
  const validation = CreateOrgSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(i => i.message).join(', ') };
  }

  // Verify session + system role
  const cookieStore = await cookies();
  const session = await getSessionFromRequest({ cookies: cookieStore } as any);
  const userId = session?.userId;
  if (!userId) return { success: false, error: 'Session expirée. Reconnectez-vous.' };

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { role: true } });
  if (!user) return { success: false, error: 'Utilisateur introuvable.' };
  const systemRole = String(user.role).toUpperCase();
  if (systemRole !== 'SUPERADMIN' && systemRole !== 'ADMIN') {
    return { success: false, error: 'Droits insuffisants pour créer une organisation.' };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [org] = await tx.insert(schema.organizations).values({
        name: validation.data.name,
        type: validation.data.type as any,
        taxId: validation.data.taxId ?? null,
        description: validation.data.description ?? null,
      }).returning();

      await tx.insert(schema.userOrganizations).values({
        userId,
        organizationId: org.id,
        role: 'ADMIN',
      });

      return org;
    });

    await audit({
      actorId: userId,
      action: 'CREATE_ORGANIZATION',
      entityId: created.id,
      entityType: 'Organization',
      newValue: created,
    });

    return { success: true, data: created };
  } catch (err: any) {
    console.error('[OrgManager] createOrganization:', err);
    if (err?.code === '23505') return { success: false, error: "Une organisation avec ce nom existe déjà." };
    return { success: false, error: 'Impossible de créer l\'organisation.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  SETTINGS (Organisation metadata)            ║
// ╚══════════════════════════════════════════════╝

/**
 * Récupère les métadonnées de l'organisation active.
 */
export async function getOrgSettings(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, ctx.orgId),
      columns: { id: true, name: true, type: true, taxId: true, description: true, createdAt: true, status: true },
    });

    if (!org) return { success: false, error: 'Organisation introuvable.' };

    return { success: true, data: org };
  } catch (err) {
    console.error('[OrgManager] getOrgSettings:', err);
    return { success: false, error: 'Impossible de charger les paramètres.' };
  }
}

/**
 * Met à jour les métadonnées de l'organisation. Réservé aux ADMIN.
 */
export async function updateOrgSettings(data: {
  name: string;
  type: string;
  taxId?: string | null;
  description?: string | null;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  const validation = UpdateOrgSettingsSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  try {
    const oldOrg = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, ctx.orgId) });
    const oldValue = await snapshot(oldOrg as Record<string, unknown> | null);

    const [updated] = await db.update(schema.organizations)
      .set({
        name: validation.data.name,
        type: validation.data.type as any,
        taxId: validation.data.taxId ?? null,
        description: validation.data.description ?? null,
      })
      .where(eq(schema.organizations.id, ctx.orgId))
      .returning();

    await audit({
      actorId: ctx.userId,
      action: 'UPDATE_ORG_SETTINGS',
      entityId: ctx.orgId,
      entityType: 'Organization',
      oldValue,
      newValue: { name: updated.name, type: updated.type, taxId: updated.taxId },
    });

    return { success: true, data: updated };
  } catch (err) {
    console.error('[OrgManager] updateOrgSettings:', err);
    return { success: false, error: 'Impossible de mettre à jour les paramètres.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  ROLES (RoleDef management)                  ║
// ╚══════════════════════════════════════════════╝

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

    // Separate count queries for _count replacement
    const roleCounts = await Promise.all(
      roles.map(async (r) => {
        const [{ value }] = await db.select({ value: count() })
          .from(schema.userOrganizations)
          .where(eq(schema.userOrganizations.roleId, r.id));
        return { id: r.id, count: value };
      })
    );
    const countMap = Object.fromEntries(roleCounts.map(rc => [rc.id, rc.count]));

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
  } catch (err: any) {
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
  } catch (err: any) {
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

/**
 * Liste les membres de l'organisation active avec leurs rôles.
 */
export async function getOrgMembers(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const members = await db.query.userOrganizations.findMany({
      where: eq(schema.userOrganizations.organizationId, ctx.orgId),
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } },
        dynRole: { columns: { id: true, name: true, permissions: true } },
        zone: { columns: { id: true, name: true } },
      },
    });

    const formatted = members.map(m => ({
      membershipId: m.id,
      userId: m.userId,
      name: m.user.name || 'Sans nom',
      email: m.user.email || '',
      phone: m.user.phone || '',
      systemRole: String(m.user.role),
      orgRole: String(m.role),
      roleDef: m.dynRole ? { id: m.dynRole.id, name: m.dynRole.name, permissions: m.dynRole.permissions } : null,
      managedZone: m.zone ? { id: m.zone.id, name: m.zone.name } : null,
      joinedAt: m.user.createdAt.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (err) {
    console.error('[OrgManager] getOrgMembers:', err);
    return { success: false, error: 'Impossible de charger les membres.' };
  }
}

/**
 * Invite un utilisateur existant dans l'organisation (via email ou téléphone).
 * Crée le lien UserOrganization de manière atomique.
 * Réservé aux ADMIN.
 */
export async function inviteOrgMember(data: {
  identifier: string;
  orgRole?: string;
  roleDefId?: string | null;
  managedZoneId?: string | null;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  const validation = InviteMemberSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  const { identifier, orgRole, roleDefId, managedZoneId } = validation.data;

  try {
    // Find user by email or phone
    const user = await db.query.users.findFirst({
      where: or(
        eq(schema.users.email, identifier),
        eq(schema.users.phone, identifier),
      ),
      columns: { id: true, name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'Aucun utilisateur trouvé avec cet email ou téléphone.' };
    }

    // Check not already a member
    const existing = await db.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, user.id),
        eq(schema.userOrganizations.organizationId, ctx.orgId),
      ),
    });
    if (existing) {
      return { success: false, error: 'Cet utilisateur est déjà membre de l\'organisation.' };
    }

    // Validate roleDefId exists if provided
    if (roleDefId) {
      const roleDef = await db.query.roleDefs.findFirst({ where: eq(schema.roleDefs.id, roleDefId) });
      if (!roleDef) return { success: false, error: 'Rôle personnalisé introuvable.' };
    }

    // Validate zone if provided
    if (managedZoneId) {
      const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, managedZoneId) });
      if (!zone) return { success: false, error: 'Zone introuvable.' };
    }

    // Atomic creation: use the transaction handle to read the inserted row
    const membership = await db.transaction(async (tx) => {
      const [created] = await tx.insert(schema.userOrganizations).values({
        userId: user.id,
        organizationId: ctx.orgId,
        role: orgRole as any,
        roleId: roleDefId ?? undefined,
        managedZoneId: managedZoneId ?? undefined,
      }).returning();

      // Fetch with relations using the transaction (ensure we read the created row)
      const full = await tx.query.userOrganizations.findFirst({
        where: eq(schema.userOrganizations.id, created.id),
        with: {
          user: { columns: { id: true, name: true, email: true } },
          dynRole: { columns: { id: true, name: true } },
        },
      });

      if (!full) throw new Error('Failed to create membership');
      return full;
    });

    if (!membership) {
      return { success: false, error: 'Impossible de créer le membre.' };
    }

    await audit({
      actorId: ctx.userId,
      action: 'INVITE_ORG_MEMBER',
      entityId: membership.id,
      entityType: 'UserOrganization',
      newValue: {
        userId: user.id,
        orgRole,
        roleDefId: roleDefId ?? null,
        managedZoneId: managedZoneId ?? null,
      },
    });

    return { success: true, data: { membershipId: membership.id, userName: user.name, userEmail: user.email } };
  } catch (err: any) {
    if (err?.code === '23505') {
      return { success: false, error: 'Cet utilisateur est déjà membre.' };
    }
    console.error('[OrgManager] inviteOrgMember:', err);
    return { success: false, error: 'Impossible d\'ajouter le membre.' };
  }
}

/**
 * Met à jour le rôle ou la zone d'un membre. Réservé aux ADMIN.
 */
export async function updateOrgMember(membershipId: string, data: {
  orgRole?: string;
  roleDefId?: string | null;
  managedZoneId?: string | null;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!membershipId) return { success: false, error: 'ID du membre requis.' };

  const validation = UpdateMemberSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  try {
    const existing = await db.query.userOrganizations.findFirst({
      where: eq(schema.userOrganizations.id, membershipId),
    });
    if (!existing) return { success: false, error: 'Membre introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Ce membre n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);

    const updateData: Record<string, unknown> = {};
    if (validation.data.orgRole !== undefined) updateData.role = validation.data.orgRole;
    if (validation.data.roleDefId !== undefined) updateData.roleId = validation.data.roleDefId;
    if (validation.data.managedZoneId !== undefined) updateData.managedZoneId = validation.data.managedZoneId;

    await db.update(schema.userOrganizations)
      .set(updateData as any)
      .where(eq(schema.userOrganizations.id, membershipId));

    // Fetch the updated record with relations
    const updated = await db.query.userOrganizations.findFirst({
      where: eq(schema.userOrganizations.id, membershipId),
      with: {
        user: { columns: { id: true, name: true } },
        dynRole: { columns: { id: true, name: true } },
      },
    });

    await audit({
      actorId: ctx.userId,
      action: 'UPDATE_ORG_MEMBER',
      entityId: membershipId,
      entityType: 'UserOrganization',
      oldValue,
      newValue: updateData,
    });

    return { success: true, data: updated };
  } catch (err) {
    console.error('[OrgManager] updateOrgMember:', err);
    return { success: false, error: 'Impossible de mettre à jour le membre.' };
  }
}

/**
 * Retire un membre de l'organisation. Réservé aux ADMIN.
 * Un admin ne peut pas se retirer lui-même.
 */
export async function removeOrgMember(membershipId: string): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!membershipId) return { success: false, error: 'ID du membre requis.' };

  try {
    const existing = await db.query.userOrganizations.findFirst({
      where: eq(schema.userOrganizations.id, membershipId),
      with: { user: { columns: { id: true, name: true } } },
    });
    if (!existing) return { success: false, error: 'Membre introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Ce membre n\'appartient pas à votre organisation.' };
    }
    if (existing.userId === ctx.userId) {
      return { success: false, error: 'Vous ne pouvez pas vous retirer vous-même.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);

    // Also remove associated work zones for this user in this org
    await db.transaction(async (tx) => {
      await tx.delete(schema.workZones).where(
        and(
          eq(schema.workZones.organizationId, ctx.orgId),
          eq(schema.workZones.managerId, existing.userId),
        ),
      );
      await tx.delete(schema.userOrganizations).where(eq(schema.userOrganizations.id, membershipId));
    });

    await audit({
      actorId: ctx.userId,
      action: 'REMOVE_ORG_MEMBER',
      entityId: membershipId,
      entityType: 'UserOrganization',
      oldValue,
    });

    return { success: true };
  } catch (err) {
    console.error('[OrgManager] removeOrgMember:', err);
    return { success: false, error: 'Impossible de retirer le membre.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  WORK ZONES (Territorial Access Control)     ║
// ╚══════════════════════════════════════════════╝

/**
 * Liste les work zones de l'organisation avec les managers assignés.
 */
export async function getOrgWorkZones(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const workZones = await db.query.workZones.findMany({
      where: eq(schema.workZones.organizationId, ctx.orgId),
      with: {
        zone: { columns: { id: true, name: true, code: true, path: true } },
        manager: { columns: { id: true, name: true, email: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    const formatted = workZones.map(wz => ({
      id: wz.id,
      zoneId: wz.zoneId,
      zoneName: wz.zone.name,
      zoneCode: wz.zone.code,
      zonePath: wz.zone.path,
      manager: wz.manager ? { id: wz.manager.id, name: wz.manager.name, email: wz.manager.email } : null,
      role: wz.role,
      createdAt: wz.createdAt.toISOString(),
    }));

    return { success: true, data: formatted };
  } catch (err) {
    console.error('[OrgManager] getOrgWorkZones:', err);
    return { success: false, error: 'Impossible de charger les zones de travail.' };
  }
}

/**
 * Récupère les détails principaux de l'organisation active (nom, description, counts)
 */
export async function getOrganizationDetails(): Promise<ServiceResult> {
  const { ctx, error } = await getOrgContext();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.id, ctx.orgId),
      columns: { id: true, name: true, description: true, createdAt: true },
    });
    if (!org) return { success: false, error: 'Organisation introuvable.' };

    const [membersCountResult, zonesCountResult] = await Promise.all([
      db.select({ value: count() }).from(schema.userOrganizations)
        .where(eq(schema.userOrganizations.organizationId, ctx.orgId)),
      db.select({ value: count() }).from(schema.workZones)
        .where(eq(schema.workZones.organizationId, ctx.orgId)),
    ]);
    const membersCount = membersCountResult[0].value;
    const zonesCount = zonesCountResult[0].value;

    // Count role definitions referenced by UserOrganization records for this org
    const orgMembersWithRoles = await db.query.userOrganizations.findMany({
      where: eq(schema.userOrganizations.organizationId, ctx.orgId),
      columns: { roleId: true },
    });
    const uniqueRoleIds = new Set(orgMembersWithRoles.map(m => m.roleId).filter(Boolean));
    const roleDefsCount = uniqueRoleIds.size;

    return {
      success: true,
      data: {
        id: org.id,
        name: org.name,
        description: org.description || null,
        createdAt: org.createdAt.toISOString(),
        membersCount,
        zonesCount,
        roleDefsCount,
      },
    } as ServiceResult;
  } catch (err) {
    console.error('[OrgManager] getOrganizationDetails:', err);
    return { success: false, error: 'Impossible de charger les informations de l\'organisation.' };
  }
}

/**
 * Assigne une zone à l'organisation avec un manager optionnel.
 * Réservé aux ADMIN ou ZONE_MANAGER.
 */
export async function assignWorkZone(data: {
  zoneId: string;
  managerId?: string | null;
  role?: string | null;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  const validation = AssignWorkZoneSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  const { zoneId, managerId, role } = validation.data;

  try {
    // Validate zone exists
    const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId), columns: { id: true, name: true } });
    if (!zone) return { success: false, error: 'Zone introuvable.' };

    // Validate manager is a member of this org (if provided)
    if (managerId) {
      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(schema.userOrganizations.userId, managerId),
          eq(schema.userOrganizations.organizationId, ctx.orgId),
        ),
      });
      if (!membership) {
        return { success: false, error: 'Le manager sélectionné n\'est pas membre de l\'organisation.' };
      }
    }

    // Upsert work zone (unique on [organizationId, zoneId])
    const [workZone] = await db.insert(schema.workZones).values({
      organizationId: ctx.orgId,
      zoneId,
      managerId: managerId ?? undefined,
      role: role ?? undefined,
    }).onConflictDoUpdate({
      target: [schema.workZones.organizationId, schema.workZones.zoneId],
      set: {
        managerId: managerId ?? null,
        role: role ?? null,
      },
    }).returning();

    // Fetch with relations
    const workZoneWithRelations = await db.query.workZones.findFirst({
      where: eq(schema.workZones.id, workZone.id),
      with: {
        zone: { columns: { id: true, name: true } },
        manager: { columns: { id: true, name: true } },
      },
    });

    await audit({
      actorId: ctx.userId,
      action: 'ASSIGN_WORK_ZONE',
      entityId: workZone.id,
      entityType: 'WorkZone',
      newValue: { zoneId, zoneName: zone.name, managerId: managerId ?? null, role: role ?? null },
    });

    return { success: true, data: workZoneWithRelations };
  } catch (err: any) {
    console.error('[OrgManager] assignWorkZone:', err);
    return { success: false, error: 'Impossible d\'assigner la zone.' };
  }
}

/**
 * Met à jour un WorkZone (manager, rôle). ADMIN ou ZONE_MANAGER.
 */
export async function updateWorkZone(workZoneId: string, data: {
  managerId?: string | null;
  role?: string | null;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!workZoneId) return { success: false, error: 'ID requis.' };

  const validation = UpdateWorkZoneSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  try {
    const existing = await db.query.workZones.findFirst({ where: eq(schema.workZones.id, workZoneId) });
    if (!existing) return { success: false, error: 'Zone de travail introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette zone n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);

    // Validate manager membership if provided
    if (validation.data.managerId) {
      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(schema.userOrganizations.userId, validation.data.managerId),
          eq(schema.userOrganizations.organizationId, ctx.orgId),
        ),
      });
      if (!membership) {
        return { success: false, error: 'Le manager sélectionné n\'est pas membre de l\'organisation.' };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.managerId !== undefined) updateData.managerId = validation.data.managerId;
    if (validation.data.role !== undefined) updateData.role = validation.data.role;

    await db.update(schema.workZones)
      .set(updateData as any)
      .where(eq(schema.workZones.id, workZoneId));

    // Fetch updated record with relations
    const updated = await db.query.workZones.findFirst({
      where: eq(schema.workZones.id, workZoneId),
      with: {
        zone: { columns: { id: true, name: true } },
        manager: { columns: { id: true, name: true } },
      },
    });

    await audit({
      actorId: ctx.userId,
      action: 'UPDATE_WORK_ZONE',
      entityId: workZoneId,
      entityType: 'WorkZone',
      oldValue,
      newValue: updateData,
    });

    return { success: true, data: updated };
  } catch (err) {
    console.error('[OrgManager] updateWorkZone:', err);
    return { success: false, error: 'Impossible de mettre à jour la zone.' };
  }
}

/**
 * Supprime un WorkZone de l'organisation. ADMIN uniquement.
 */
export async function removeWorkZone(workZoneId: string): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  if (!workZoneId) return { success: false, error: 'ID requis.' };

  try {
    const existing = await db.query.workZones.findFirst({
      where: eq(schema.workZones.id, workZoneId),
      with: { zone: { columns: { name: true } } },
    });
    if (!existing) return { success: false, error: 'Zone introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette zone n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);
    await db.delete(schema.workZones).where(eq(schema.workZones.id, workZoneId));

    await audit({
      actorId: ctx.userId,
      action: 'REMOVE_WORK_ZONE',
      entityId: workZoneId,
      entityType: 'WorkZone',
      oldValue,
    });

    return { success: true };
  } catch (err) {
    console.error('[OrgManager] removeWorkZone:', err);
    return { success: false, error: 'Impossible de supprimer la zone.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  LOOKUP HELPERS (for dropdowns/comboboxes)   ║
// ╚══════════════════════════════════════════════╝

/**
 * Liste toutes les zones disponibles pour le sélecteur de work-zones.
 */
export async function getAvailableZones(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Accès refusé' };

  try {
    const zones = await db.query.zones.findMany({
      where: eq(schema.zones.isActive, true),
      columns: { id: true, name: true, code: true, path: true, depth: true },
      orderBy: (t, { asc }) => [asc(t.depth), asc(t.name)],
    });
    return { success: true, data: zones };
  } catch (err) {
    console.error('[OrgManager] getAvailableZones:', err);
    return { success: false, error: 'Impossible de charger les zones.' };
  }
}
