import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit, snapshot } from '@/lib/audit';
import { AssignWorkZoneSchema, UpdateWorkZoneSchema } from '@/lib/validators';
import { ServiceResult, requireOrgAdmin, requireOrgManager } from './org-context';
import { asError } from '@/lib/errors';

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
  } catch (_err: unknown) {
    const err = asError(_err);
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
