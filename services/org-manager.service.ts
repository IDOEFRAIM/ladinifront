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
import { prisma } from '@/lib/prisma';
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
import type { OrgRole } from '@prisma/client';

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
      console.log(`getOrgContext: using activeOrgId from session=${orgId}`);
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
          console.log(`getOrgContext: using organizationId from user-org cookie=${orgId}`);
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
    prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId: orgId } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { success: false, error: 'Utilisateur introuvable.' };
  const systemRole = String(user.role).toUpperCase();
  if (systemRole !== 'SUPERADMIN' && systemRole !== 'ADMIN') {
    return { success: false, error: 'Droits insuffisants pour créer une organisation.' };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: {
        name: validation.data.name,
        type: validation.data.type as any,
        taxId: validation.data.taxId ?? null,
        description: validation.data.description ?? null,
      } });

      await tx.userOrganization.create({ data: {
        userId,
        organizationId: org.id,
        role: 'ADMIN' as OrgRole,
      } });

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
    if (err?.code === 'P2002') return { success: false, error: "Une organisation avec ce nom existe déjà." };
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
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, type: true, taxId: true, description: true, createdAt: true, status: true },
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
    const oldOrg = await prisma.organization.findUnique({ where: { id: ctx.orgId } });
    const oldValue = await snapshot(oldOrg as Record<string, unknown> | null);

    const updated = await prisma.organization.update({
      where: { id: ctx.orgId },
      data: {
        name: validation.data.name,
        type: validation.data.type as any,
        taxId: validation.data.taxId ?? null,
        description: validation.data.description ?? null,
      },
    });

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
    const roles = await prisma.roleDef.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { userOrgs: true } },
      },
    });

    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      membersCount: r._count.userOrgs,
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
    const role = await prisma.roleDef.create({
      data: {
        name: validation.data.name,
        description: validation.data.description ?? null,
        permissions: validation.data.permissions,
      },
    });

    await audit({
      actorId: ctx.userId,
      action: 'CREATE_ROLE_DEF',
      entityId: role.id,
      entityType: 'RoleDef',
      newValue: { name: role.name, permissions: role.permissions },
    });

    return { success: true, data: role };
  } catch (err: any) {
    if (err?.code === 'P2002') {
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
    const oldRole = await prisma.roleDef.findUnique({ where: { id: roleId } });
    if (!oldRole) return { success: false, error: 'Rôle introuvable.' };
    const oldValue = await snapshot(oldRole as unknown as Record<string, unknown>);

    const updateData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) updateData.name = validation.data.name;
    if (validation.data.description !== undefined) updateData.description = validation.data.description;
    if (validation.data.permissions !== undefined) updateData.permissions = validation.data.permissions;

    const updated = await prisma.roleDef.update({
      where: { id: roleId },
      data: updateData as any,
    });

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
    if (err?.code === 'P2002') {
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
    const role = await prisma.roleDef.findUnique({
      where: { id: roleId },
      include: { _count: { select: { userOrgs: true } } },
    });
    if (!role) return { success: false, error: 'Rôle introuvable.' };

    if (role._count.userOrgs > 0) {
      return { success: false, error: `Impossible de supprimer : ${role._count.userOrgs} membre(s) utilisent ce rôle.` };
    }

    const oldValue = await snapshot(role as unknown as Record<string, unknown>);
    await prisma.roleDef.delete({ where: { id: roleId } });

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
    const members = await prisma.userOrganization.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true } },
        dynRole: { select: { id: true, name: true, permissions: true } },
        zone: { select: { id: true, name: true } },
      },
      orderBy: { user: { createdAt: 'desc' } },
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
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'Aucun utilisateur trouvé avec cet email ou téléphone.' };
    }

    // Check not already a member
    const existing = await prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: ctx.orgId } },
    });
    if (existing) {
      return { success: false, error: 'Cet utilisateur est déjà membre de l\'organisation.' };
    }

    // Validate roleDefId exists if provided
    if (roleDefId) {
      const roleDef = await prisma.roleDef.findUnique({ where: { id: roleDefId } });
      if (!roleDef) return { success: false, error: 'Rôle personnalisé introuvable.' };
    }

    // Validate zone if provided
    if (managedZoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: managedZoneId } });
      if (!zone) return { success: false, error: 'Zone introuvable.' };
    }

    // Atomic creation
    const membership = await prisma.$transaction(async (tx) => {
      const created = await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: ctx.orgId,
          role: orgRole as OrgRole,
          roleId: roleDefId ?? undefined,
          managedZoneId: managedZoneId ?? undefined,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          dynRole: { select: { id: true, name: true } },
        },
      });
      return created;
    });

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
    if (err?.code === 'P2002') {
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
    const existing = await prisma.userOrganization.findUnique({
      where: { id: membershipId },
    });
    if (!existing) return { success: false, error: 'Membre introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Ce membre n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);

    const updateData: Record<string, unknown> = {};
    if (validation.data.orgRole !== undefined) updateData.role = validation.data.orgRole as OrgRole;
    if (validation.data.roleDefId !== undefined) updateData.roleId = validation.data.roleDefId;
    if (validation.data.managedZoneId !== undefined) updateData.managedZoneId = validation.data.managedZoneId;

    const updated = await prisma.userOrganization.update({
      where: { id: membershipId },
      data: updateData as any,
      include: {
        user: { select: { id: true, name: true } },
        dynRole: { select: { id: true, name: true } },
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
    const existing = await prisma.userOrganization.findUnique({
      where: { id: membershipId },
      include: { user: { select: { id: true, name: true } } },
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
    await prisma.$transaction([
      prisma.workZone.deleteMany({
        where: { organizationId: ctx.orgId, managerId: existing.userId },
      }),
      prisma.userOrganization.delete({ where: { id: membershipId } }),
    ]);

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
    const workZones = await prisma.workZone.findMany({
      where: { organizationId: ctx.orgId },
      include: {
        zone: { select: { id: true, name: true, code: true, path: true } },
        manager: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
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
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, description: true, createdAt: true },
    });
    if (!org) return { success: false, error: 'Organisation introuvable.' };

    const [membersCount, zonesCount, roleDefsCount] = await Promise.all([
      prisma.userOrganization.count({ where: { organizationId: ctx.orgId } }),
      prisma.workZone.count({ where: { organizationId: ctx.orgId } }),
      // RoleDef is a global table; count role definitions that are referenced
      // by UserOrganization records for this organization.
      prisma.roleDef.count({ where: { userOrgs: { some: { organizationId: ctx.orgId } } } }),
    ]);

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
    const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { id: true, name: true } });
    if (!zone) return { success: false, error: 'Zone introuvable.' };

    // Validate manager is a member of this org (if provided)
    if (managerId) {
      const membership = await prisma.userOrganization.findUnique({
        where: { userId_organizationId: { userId: managerId, organizationId: ctx.orgId } },
      });
      if (!membership) {
        return { success: false, error: 'Le manager sélectionné n\'est pas membre de l\'organisation.' };
      }
    }

    // Upsert work zone (unique on [organizationId, zoneId])
    const workZone = await prisma.workZone.upsert({
      where: {
        organizationId_zoneId: { organizationId: ctx.orgId, zoneId },
      },
      create: {
        organizationId: ctx.orgId,
        zoneId,
        managerId: managerId ?? undefined,
        role: role ?? undefined,
      },
      update: {
        managerId: managerId ?? null,
        role: role ?? null,
      },
      include: {
        zone: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    await audit({
      actorId: ctx.userId,
      action: 'ASSIGN_WORK_ZONE',
      entityId: workZone.id,
      entityType: 'WorkZone',
      newValue: { zoneId, zoneName: zone.name, managerId: managerId ?? null, role: role ?? null },
    });

    return { success: true, data: workZone };
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
    const existing = await prisma.workZone.findUnique({ where: { id: workZoneId } });
    if (!existing) return { success: false, error: 'Zone de travail introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette zone n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);

    // Validate manager membership if provided
    if (validation.data.managerId) {
      const membership = await prisma.userOrganization.findUnique({
        where: { userId_organizationId: { userId: validation.data.managerId, organizationId: ctx.orgId } },
      });
      if (!membership) {
        return { success: false, error: 'Le manager sélectionné n\'est pas membre de l\'organisation.' };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.managerId !== undefined) updateData.managerId = validation.data.managerId;
    if (validation.data.role !== undefined) updateData.role = validation.data.role;

    const updated = await prisma.workZone.update({
      where: { id: workZoneId },
      data: updateData as any,
      include: {
        zone: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
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
    const existing = await prisma.workZone.findUnique({
      where: { id: workZoneId },
      include: { zone: { select: { name: true } } },
    });
    if (!existing) return { success: false, error: 'Zone introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette zone n\'appartient pas à votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);
    await prisma.workZone.delete({ where: { id: workZoneId } });

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
    const zones = await prisma.zone.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true, path: true, depth: true },
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
    });
    return { success: true, data: zones };
  } catch (err) {
    console.error('[OrgManager] getAvailableZones:', err);
    return { success: false, error: 'Impossible de charger les zones.' };
  }
}
