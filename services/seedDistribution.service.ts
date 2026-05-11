import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import crypto from 'crypto';
import { audit } from '@/lib/audit';
import { sql } from 'drizzle-orm';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 3;

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

    if ((allocation.remainingQuantity ?? 0) < quantity) throw new Error('Stock insuffisant sur cette allocation');

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
      quantity,
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

async function dispatchDistributionCode(
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

export async function verifySeedDistributionCode(agentUserId: string, distributionId: string, codeInput: string, ipAddress?: string) {
  return await db.transaction(async (tx) => {
    const dist = await tx.query.seedDistributions.findFirst({ where: eq(schema.seedDistributions.id, distributionId) });
    if (!dist) throw new Error('Distribution introuvable');
    if (dist.status !== 'PENDING') throw new Error('Distribution déjà traitée');

    // Authorization: assigned agent OR org/zone stock verifier OR global admin
    if (String(dist.agentId) !== String(agentUserId)) {
      const ctx = await buildAccessContext(agentUserId);
      const authResp = AccessManager.can(ctx)
        .permission(PERMISSIONS.STOCK_VERIFY)
        .inOrg(dist.organizationId)
        .inZone(dist.zoneId)
        .toResponse();
      if (authResp) throw new Error('Accès refusé');
    }

    if (dist.verificationCodeExpiresAt && new Date(dist.verificationCodeExpiresAt) < new Date()) {
      // expire
      await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      throw new Error('Code expiré');
    }

    const salt = (dist.metadata && (dist.metadata as any).salt) || '';
    const storedHash = String(dist.verificationCodeHash || '');
    if (!salt || !storedHash) throw new Error('Code non configuré');

    // Support both historical hash formats:
    // - v2 (service): sha256(code + salt)
    // - v1 (legacy API): sha256(salt + code)
    const expectedV2 = crypto.createHash('sha256').update(codeInput + salt).digest('hex');
    const expectedV1 = crypto.createHash('sha256').update(salt + codeInput).digest('hex');

    const ok = (() => {
      try {
        const a = Buffer.from(storedHash, 'hex');
        const b2 = Buffer.from(expectedV2, 'hex');
        if (a.length === b2.length && crypto.timingSafeEqual(a, b2)) return true;
        const b1 = Buffer.from(expectedV1, 'hex');
        if (a.length === b1.length && crypto.timingSafeEqual(a, b1)) return true;
        return false;
      } catch {
        return false;
      }
    })();

    // record attempt
    await tx.insert(schema.seedDistributionAttempts).values({
      distributionId,
      actorId: agentUserId,
      attemptType: 'CODE_ENTRY',
      success: ok,
      ipAddress: ipAddress || null,
      metadata: { inputLength: String(codeInput).length },
    });

    if (!ok) {
      const attempts = (dist.attemptsCount || 0) + 1;
      await tx.update(schema.seedDistributions).set({ attemptsCount: attempts }).where(eq(schema.seedDistributions.id, distributionId));
      await audit({ actorId: agentUserId, action: 'SEED_DISTRIBUTION_VERIFY_FAILED', entityId: distributionId, entityType: 'SEED_DISTRIBUTION', newValue: { attempts } });
      if (attempts >= MAX_ATTEMPTS) {
        await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      }
      throw new Error('Code invalide');
    }

    // OK: finalize in transaction — re-check allocation stock
    const allocation = await tx.query.seedAllocations.findFirst({ where: eq(schema.seedAllocations.id, dist.allocationId) });
    if (!allocation) throw new Error('Allocation introuvable');
    if ((allocation.remainingQuantity ?? 0) < (dist.quantity ?? 0)) {
      await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      throw new Error('Stock insuffisant lors de la confirmation');
    }

    // decrement stock atomically (avoid negative remaining_quantity on concurrent confirms)
    const updatedAlloc = await tx
      .update(schema.seedAllocations)
      .set({ remainingQuantity: sql`${schema.seedAllocations.remainingQuantity} - ${dist.quantity}` })
      .where(and(eq(schema.seedAllocations.id, allocation.id), gte(schema.seedAllocations.remainingQuantity, dist.quantity)))
      .returning({ id: schema.seedAllocations.id });
    if (!updatedAlloc?.length) {
      await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      throw new Error('Stock insuffisant lors de la confirmation');
    }

    // mark distribution completed
    await tx.update(schema.seedDistributions).set({ status: 'COMPLETED', receiptAt: new Date() }).where(eq(schema.seedDistributions.id, distributionId));

    // audit & trust score bump
    await audit({ actorId: agentUserId, action: 'SEED_DISTRIBUTION_COMPLETED', entityId: distributionId, entityType: 'SEED_DISTRIBUTION', newValue: { allocationId: allocation.id, quantity: dist.quantity } });

    // bump reliabilityIndex (simple +1 heuristic — adjust later)
    const bump = 1.0;
    const producer = await tx.query.producers.findFirst({
      where: eq(schema.producers.id, dist.producerId),
      columns: { userId: true },
    });
    if (producer?.userId) {
      await tx.execute(sql`UPDATE intelligence.trust_scores SET reliability_index = reliability_index + ${bump} WHERE user_id = ${producer.userId}`);
    }
    await tx.execute(sql`UPDATE intelligence.trust_scores SET reliability_index = reliability_index + ${bump} WHERE user_id = ${dist.agentId}`);

    return { success: true };
  });
}
