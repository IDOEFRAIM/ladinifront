import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { ServiceResult, requireOrgManager } from './org-context';

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
 * Liste les producteurs de l'organisation (pour les dropdowns de distribution).
 *
 * producers.organizationId is nullable — many producers have NULL there because
 * they were created at registration time, before being linked to an org.
 * So we also match via userOrganizations membership to capture all org members
 * who have a producer profile.
 */
export async function getOrgProducers(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };

  try {
    // Strategy: find all userIds that belong to this org, then fetch their producer profiles
    const orgMembers = await db.query.userOrganizations.findMany({
      where: eq(schema.userOrganizations.organizationId, ctx.orgId),
      columns: { userId: true },
    });
    const memberUserIds = orgMembers.map(m => m.userId);

    if (memberUserIds.length === 0) {
      return { success: true, data: [] };
    }

    // Also include producers directly linked via producers.organizationId (legacy)
    const rows = await db.query.producers.findMany({
      where: or(
        eq(schema.producers.organizationId, ctx.orgId),
        inArray(schema.producers.userId, memberUserIds),
      ),
      columns: { id: true, businessName: true, status: true, userId: true },
      with: {
        user: { columns: { id: true, name: true, email: true, phone: true } },
        zone: { columns: { id: true, name: true } },
      },
      orderBy: (t, { asc }) => [asc(t.businessName)],
      limit: 500,
    });

    // Deduplicate by producer id
    const seen = new Set<string>();
    const data: any[] = [];
    for (const r of rows as any[]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      data.push({
        id: r.id,
        businessName: r.businessName,
        status: r.status,
        userName: r.user?.name ?? null,
        email: r.user?.email ?? null,
        phone: r.user?.phone ?? null,
        zone: r.zone ? { id: r.zone.id, name: r.zone.name } : null,
      });
    }

    return { success: true, data };
  } catch (err) {
    console.error('[OrgManager] getOrgProducers:', err);
    return { success: false, error: 'Impossible de charger les producteurs.' };
  }
}
