import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { audit, snapshot } from '@/lib/audit';
import { InviteMemberSchema, UpdateMemberSchema } from '@/lib/validators';
import { ServiceResult, requireOrgAdmin } from './org-context';
import { asError } from '@/lib/errors';

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
  } catch (_err: unknown) {
    const err = asError(_err);
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
