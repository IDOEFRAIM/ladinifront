import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { audit } from '@/lib/audit';
import { OTP_TTL_MINUTES } from '@/features/inventory/services/seed-distribution.config';

export async function initializeSeedDistribution(
  agentUserId: string,
  producerId: string,
  allocationId: string,
  quantity: number,
  cnibProvided?: string,
  channel = 'IN_APP'
) {
  return await db.transaction(async (tx) => {
    if (!agentUserId) throw new Error('unauthenticated');
    if (!producerId) throw new Error('producer_required');
    if (!allocationId) throw new Error('allocation_required');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('invalid_quantity');

    // Verify allocation
    const allocation = await tx.query.seedAllocations.findFirst({ where: eq(schema.seedAllocations.id, allocationId) });
    if (!allocation) throw new Error('Allocation introuvable');

    // Verify agent membership in the organization and zone
    // System admins (ADMIN/SUPERADMIN) may not be in userOrganizations but should be allowed
    const agentMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, agentUserId),
        eq(schema.userOrganizations.organizationId, allocation.organizationId)
      ),
    });

    let isSystemAdmin = false;
    if (!agentMembership) {
      const agentUser = await tx.query.users.findFirst({
        where: eq(schema.users.id, agentUserId),
        columns: { role: true },
      });
      const sysRole = String(agentUser?.role || '').toUpperCase();
      isSystemAdmin = sysRole === 'ADMIN' || sysRole === 'SUPERADMIN';
      if (!isSystemAdmin) throw new Error('Agent non rattaché à l\'organisation');
    }

    // Ensure agent manages the zone (managedZoneId) or has a permissive role
    // System admins and org ADMIN/ZONE_MANAGER can distribute to any zone
    if (!isSystemAdmin) {
      const adminRoles = ['ADMIN', 'ZONE_MANAGER'];
      const fieldRoles = ['FIELD_AGENT', 'ZONE_AGENT', 'SUB_ZONE_AGENT'];
      const agentRole = agentMembership!.role || '';
      const isOrgAdmin = adminRoles.includes(agentRole);
      const isFieldAgent = fieldRoles.includes(agentRole);
      if (!isOrgAdmin && !(isFieldAgent && String(agentMembership!.managedZoneId) === String(allocation.zoneId))) {
        throw new Error('Agent hors zone autorisée');
      }
    }

    if (Number(allocation.remainingQuantity ?? 0) < quantity) throw new Error('Stock insuffisant sur cette allocation');

    // Verify producer exists (producerId references marketplace.producers.id)
    const producer = await tx.query.producers.findFirst({
      where: eq(schema.producers.id, producerId),
      columns: { id: true, userId: true },
    });
    if (!producer) throw new Error('Producteur introuvable');

    // Create distribution pending
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const salt = crypto.randomBytes(12).toString('hex');
    // Hash format (v2): sha256(code + salt)
    const hash = crypto.createHash('sha256').update(code + salt).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const [distribution] = await tx.insert(schema.seedDistributions).values({
      allocationId,
      producerId: producer.id,
      agentId: agentUserId,
      organizationId: allocation.organizationId,
      zoneId: allocation.zoneId,
      quantity: String(quantity),
      cnibProvided: cnibProvided || null,
      verificationCodeHash: hash,
      verificationCodeExpiresAt: expiresAt,
      verificationChannel: channel,
      attemptsCount: 0,
      status: 'PENDING',
      metadata: { salt },
    }).returning();

    await audit({
      actorId: agentUserId,
      action: 'SEED_DISTRIBUTION_INIT',
      entityId: distribution.id,
      entityType: 'SEED_DISTRIBUTION',
      newValue: { allocationId, producerId: producer.id, quantity },
    });

    // Dispatch the code via in-app for now (returns code for operator/service layer)
    await dispatchDistributionCode(tx, distribution.id, producer.id, producer.userId, code, channel);

    return { distributionId: distribution.id };
  });
}

export async function dispatchDistributionCode(
  tx: any,
  distributionId: string,
  producerId: string,
  producerUserId: string,
  code: string,
  channel: string
) {
  // In-app: create an agentAction & audit entry. SMS can be added later by wiring a provider here.
  await tx.insert(schema.agentActions).values({
    agentName: 'system',
    actionType: 'SEND_DISTRIBUTION_OTP',
    payload: { distributionId, channel, producerId, producerUserId, codeRedacted: true },
    status: 'COMPLETED',
  });

  await audit({
    actorId: null as any,
    action: 'SEED_DISTRIBUTION_OTP_SENT',
    entityId: distributionId,
    entityType: 'SEED_DISTRIBUTION',
    newValue: { channel },
  });

  // Note: For dev/testing we might return the code, but in production do not return it from API.
  return true;
}
