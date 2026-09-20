// Organisation — distributions de semences.
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { CreateDistributionSchema } from '@/lib/validators';
import { assertDistTransition, isCancellable } from '@/lib/distributionStateMachine';
import { ServiceResult, requireOrgAdmin, requireOrgManager } from './org-context';
import { asError } from '@/lib/errors';

/**
 * Liste les distributions de l'organisation active.
 */
export async function getOrgDistributions(filters?: {
  status?: string;
  allocationId?: string;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };

  try {
    const rows = await db.query.seedDistributions.findMany({
      where: eq(schema.seedDistributions.organizationId, ctx.orgId),
      orderBy: (t, ops) => [ops.desc(t.createdAt)],
      limit: 300,
      with: {
        allocation: { columns: { id: true, seedType: true, remainingQuantity: true } },
        producer: {
          columns: { id: true, businessName: true },
          with: { user: { columns: { id: true, name: true, email: true, phone: true } } },
        },
        agent: { columns: { id: true, name: true, email: true } },
        zone: { columns: { id: true, name: true } },
      },
    });

    let filtered = rows as unknown[];
    if (filters?.status) {
      filtered = filtered.filter((r: any) => r.status === String(filters.status).toUpperCase());
    }
    if (filters?.allocationId) {
      filtered = filtered.filter((r: any) => r.allocationId === filters.allocationId);
    }

    const data = filtered.map((r: any) => ({
      id: r.id,
      allocationId: r.allocationId,
      seedType: r.allocation?.seedType ?? null,
      producer: r.producer ? {
        id: r.producer.id,
        businessName: r.producer.businessName,
        userName: r.producer.user?.name ?? null,
        email: r.producer.user?.email ?? null,
        phone: r.producer.user?.phone ?? null,
      } : null,
      agent: r.agent ? { id: r.agent.id, name: r.agent.name, email: r.agent.email } : null,
      zone: r.zone ? { id: r.zone.id, name: r.zone.name } : null,
      quantity: r.quantity,
      status: r.status,
      attemptsCount: r.attemptsCount ?? 0,
      createdAt: r.createdAt?.toISOString?.() ?? null,
      receiptAt: r.receiptAt?.toISOString?.() ?? null,
    }));

    return { success: true, data };
  } catch (err) {
    console.error('[OrgManager] getOrgDistributions:', err);
    return { success: false, error: 'Impossible de charger les distributions.' };
  }
}

/**
 * Cree une distribution. Delegue au service metier existant.
 * ADMIN ou ZONE_MANAGER uniquement.
 */
export async function createOrgDistribution(data: {
  allocationId: string;
  producerId: string;
  quantity: number;
  assignedTo?: string | null;
  cnibProvided?: string | null;
  channel?: string;
}): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgManager();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };

  const validation = CreateDistributionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map(e => e.message).join(', ') };
  }

  const { allocationId, producerId, quantity, assignedTo, cnibProvided, channel } = validation.data;

  try {
    const allocation = await db.query.seedAllocations.findFirst({
      where: eq(schema.seedAllocations.id, allocationId),
      columns: { id: true, organizationId: true },
    });
    if (!allocation) return { success: false, error: 'Allocation introuvable.' };
    if (allocation.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette allocation n\'appartient pas a votre organisation.' };
    }

    const effectiveAgentId = (assignedTo && ctx.isOrgAdmin) ? assignedTo : ctx.userId;

    if (assignedTo && assignedTo !== ctx.userId) {
      const membership = await db.query.userOrganizations.findFirst({
        where: and(
          eq(schema.userOrganizations.userId, assignedTo),
          eq(schema.userOrganizations.organizationId, ctx.orgId),
        ),
      });
      if (!membership) return { success: false, error: 'L\'agent assigne n\'est pas membre de l\'organisation.' };
    }

    const { initializeSeedDistribution } = await import('@/features/inventory/services/seed-distribution.service');
    const result = await initializeSeedDistribution(
      effectiveAgentId,
      producerId,
      allocationId,
      quantity,
      cnibProvided ?? undefined,
      channel ?? 'IN_APP',
    );

    return { success: true, data: result };
  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('[OrgManager] createOrgDistribution:', err);
    return { success: false, error: err?.message || 'Impossible de creer la distribution.' };
  }
}

/**
 * Annule une distribution PENDING. ADMIN uniquement.
 */
export async function cancelOrgDistribution(distributionId: string): Promise<ServiceResult> {
  const { ctx, error } = await requireOrgAdmin();
  if (error || !ctx) return { success: false, error: error || 'Acces refuse' };
  if (!distributionId) return { success: false, error: 'ID requis.' };

  try {
    const dist = await db.query.seedDistributions.findFirst({
      where: eq(schema.seedDistributions.id, distributionId),
    });
    if (!dist) return { success: false, error: 'Distribution introuvable.' };
    if (dist.organizationId !== ctx.orgId) {
      return { success: false, error: 'Cette distribution n\'appartient pas a votre organisation.' };
    }

    if (!isCancellable(dist.status)) {
      return { success: false, error: `Impossible d'annuler une distribution au statut ${dist.status}.` };
    }

    assertDistTransition(dist.status, 'CANCELLED');

    await db.update(schema.seedDistributions)
      .set({ status: 'CANCELLED', updatedAt: new Date() } as any)
      .where(eq(schema.seedDistributions.id, distributionId));

    await audit({
      actorId: ctx.userId,
      action: 'CANCEL_DISTRIBUTION',
      entityId: distributionId,
      entityType: 'SeedDistribution',
      oldValue: { status: dist.status },
      newValue: { status: 'CANCELLED' },
    });

    return { success: true };
  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('[OrgManager] cancelOrgDistribution:', err);
    return { success: false, error: err?.message || 'Impossible d\'annuler la distribution.' };
  }
}
