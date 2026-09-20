// Organisation — création et paramètres.
import { cookies } from 'next/headers';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { audit, snapshot } from '@/lib/audit';
import { UpdateOrgSettingsSchema, CreateOrgSchema } from '@/lib/validators';
import { ServiceResult, requireOrgAdmin, requireOrgManager } from './org-context';
import { asError } from '@/lib/errors';

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
  const session = await getSessionFromRequest({ cookies: cookieStore });
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
  } catch (_err: unknown) {
    const err = asError(_err);
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
