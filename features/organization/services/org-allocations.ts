// Organisation — allocations de semences.
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { audit, snapshot } from '@/lib/audit';
import { CreateAllocationSchema, UpdateAllocationSchema } from '@/lib/validators';
import { ServiceResult, requireOrgAdmin, requireOrgManager } from './org-context';

/**
 * Liste les allocations de l'organisation active avec zone et allocatedBy.
 */
export async function getOrgAllocations(): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };

  try {
    const rows = await db.query.seedAllocations.findMany({
      where: eq(schema.seedAllocations.organizationId, ctx.orgId),
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      limit: 300,
      with: {
        zone: { columns: { id: true, name: true, code: true } },
        allocatedBy: { columns: { id: true, name: true } },
      },
    });

    const data = rows.map((r: any) => ({
      id: r.id,
      seedType: r.seedType,
      totalQuantity: r.totalQuantity,
      remainingQuantity: r.remainingQuantity,
      unit: r.unit,
      zone: r.zone ? { id: r.zone.id, name: r.zone.name, code: r.zone.code } : null,
      allocatedBy: r.allocatedBy ? { id: r.allocatedBy.id, name: r.allocatedBy.name } : null,
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
    }));

    return { success: true, data };
  } catch (err) {
    console.error('[OrgManager] getOrgAllocations:', err);
    return { success: false, error: 'Impossible de charger les allocations.' };
  }
}

/**
 * Cree une allocation. ADMIN uniquement.
 */
export async function createOrgAllocation(data: {
  seedType: string;
  totalQuantity: number;
  unit?: string;
  zoneId: string;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };

  const validation = CreateAllocationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  const { seedType, totalQuantity, unit, zoneId } = validation.data;

  try {
    const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, zoneId), columns: { id: true, name: true } });
    if (!zone) return { success: false, error: 'Zone introuvable.' };

    const [created] = await db.insert(schema.seedAllocations).values({
      organizationId: ctx.orgId,
      zoneId,
      seedType,
      totalQuantity: String(totalQuantity),
      remainingQuantity: String(totalQuantity),
      unit: unit ?? 'KG',
      allocatedById: ctx.userId,
    }).returning();

    await audit({
      actorId: ctx.userId,
      action: 'CREATE_ALLOCATION',
      entityId: created.id,
      entityType: 'SeedAllocation',
      newValue: { seedType, totalQuantity, unit, zoneId, zoneName: zone.name },
    });

    return { success: true, data: { ...created, zone } };
  } catch (err) {
    console.error('[OrgManager] createOrgAllocation:', err);
    return { success: false, error: 'Impossible de creer l\'allocation.' };
  }
}

/**
 * Met a jour une allocation. ADMIN uniquement.
 */
export async function updateOrgAllocation(allocationId: string, data: {
  seedType?: string;
  totalQuantity?: number;
  unit?: string;
  zoneId?: string;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };
  if (!allocationId) return { success: false, error: 'ID requis.' };

  const validation = UpdateAllocationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  try {
    const existing = await db.query.seedAllocations.findFirst({
      where: eq(schema.seedAllocations.id, allocationId),
    });
    if (!existing) return { success: false, error: 'Allocation introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette allocation n\'appartient pas a votre organisation.' };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);
    const updates: Record<string, unknown> = {};

    if (validation.data.seedType !== undefined) updates.seedType = validation.data.seedType;
    if (validation.data.unit !== undefined) updates.unit = validation.data.unit;
    if (validation.data.zoneId !== undefined) {
      const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, validation.data.zoneId), columns: { id: true } });
      if (!zone) return { success: false, error: 'Zone introuvable.' };
      updates.zoneId = validation.data.zoneId;
    }
    if (validation.data.totalQuantity !== undefined) {
      const newTotal = validation.data.totalQuantity;
      const diff = newTotal - Number(existing.totalQuantity ?? 0);
      const newRemaining = Number(existing.remainingQuantity ?? 0) + diff;
      if (newRemaining < 0) return { success: false, error: 'Le stock restant ne peut pas etre negatif.' };
      updates.totalQuantity = String(newTotal);
      updates.remainingQuantity = String(newRemaining);
    }

    await db.update(schema.seedAllocations)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(schema.seedAllocations.id, allocationId));

    await audit({
      actorId: ctx.userId,
      action: 'UPDATE_ALLOCATION',
      entityId: allocationId,
      entityType: 'SeedAllocation',
      oldValue,
      newValue: updates,
    });

    return { success: true, data: { id: allocationId, ...updates } };
  } catch (err) {
    console.error('[OrgManager] updateOrgAllocation:', err);
    return { success: false, error: 'Impossible de mettre a jour l\'allocation.' };
  }
}

/**
 * Supprime une allocation. ADMIN uniquement. Interdit si des distributions existent.
 */
export async function deleteOrgAllocation(allocationId: string): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };
  if (!allocationId) return { success: false, error: 'ID requis.' };

  try {
    const existing = await db.query.seedAllocations.findFirst({
      where: eq(schema.seedAllocations.id, allocationId),
    });
    if (!existing) return { success: false, error: 'Allocation introuvable.' };
    if (existing.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette allocation n\'appartient pas a votre organisation.' };
    }

    const distCount = await db.select({ c: count() })
      .from(schema.seedDistributions)
      .where(eq(schema.seedDistributions.allocationId, allocationId));
    if (distCount[0]?.c > 0) {
      return { success: false, error: `Impossible de supprimer : ${distCount[0].c} distribution(s) liee(s).` };
    }

    const oldValue = await snapshot(existing as unknown as Record<string, unknown>);
    await db.delete(schema.seedAllocations).where(eq(schema.seedAllocations.id, allocationId));

    await audit({
      actorId: ctx.userId,
      action: 'DELETE_ALLOCATION',
      entityId: allocationId,
      entityType: 'SeedAllocation',
      oldValue,
    });

    return { success: true };
  } catch (err) {
    console.error('[OrgManager] deleteOrgAllocation:', err);
    return { success: false, error: 'Impossible de supprimer l\'allocation.' };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  SEED DISTRIBUTIONS                           ║
// ╚══════════════════════════════════════════════╝
