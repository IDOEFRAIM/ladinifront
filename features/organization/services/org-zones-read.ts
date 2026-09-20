import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { ServiceResult, getOrgContext, requireOrgManager } from './org-context';

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

// ╔══════════════════════════════════════════════╗
// ║  SEED ALLOCATIONS                             ║
// ╚══════════════════════════════════════════════╝
