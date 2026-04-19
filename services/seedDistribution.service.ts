import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { audit } from '@/lib/audit';
import { sql } from 'drizzle-orm';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 3;

export async function initializeSeedDistribution(agentUserId: string, producerUserId: string, allocationId: string, quantity: number, cnibProvided?: string, channel = 'IN_APP') {
  return await db.transaction(async (tx) => {
    // Verify allocation
    const allocation = await tx.query.seedAllocations.findFirst({ where: eq(schema.seedAllocations.id, allocationId) });
    if (!allocation) throw new Error('Allocation introuvable');

    // Verify agent membership in the organization and zone
    const agentMembership = await tx.query.userOrganizations.findFirst({
      where: and(
        eq(schema.userOrganizations.userId, agentUserId),
        eq(schema.userOrganizations.organizationId, allocation.organizationId)
      ),
    });
    if (!agentMembership) throw new Error('Agent non rattaché à l\'organisation');

    // Ensure agent manages the zone (managedZoneId) or has a permissive role
    const allowedRoles = ['FIELD_AGENT', 'ZONE_AGENT', 'SUB_ZONE_AGENT', 'ZONE_MANAGER'];
    if (String(agentMembership.managedZoneId) !== String(allocation.zoneId) && !allowedRoles.includes(agentMembership.role || '')) {
      throw new Error('Agent hors zone autorisée');
    }

    if (allocation.remainingQuantity < quantity) throw new Error('Stock insuffisant sur cette allocation');

    // Create distribution pending
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const salt = crypto.randomBytes(12).toString('hex');
    const hash = crypto.createHash('sha256').update(code + salt).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const [distribution] = await tx.insert(schema.seedDistributions).values({
      allocationId,
      producerId: producerUserId,
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
      newValue: { allocationId, producerUserId, quantity },
    });

    // Dispatch the code via in-app for now (returns code for operator/service layer)
    await dispatchDistributionCode(tx, distribution.id, producerUserId, code, channel);

    return { distributionId: distribution.id };
  });
}

async function dispatchDistributionCode(tx: any, distributionId: string, producerUserId: string, code: string, channel: string) {
  // In-app: create an agentAction & audit entry. SMS can be added later by wiring a provider here.
  await tx.insert(schema.agentActions).values({
    agentName: 'system',
    actionType: 'SEND_DISTRIBUTION_OTP',
    payload: { distributionId, code, channel, producerUserId },
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
    if (dist.verificationCodeExpiresAt && new Date(dist.verificationCodeExpiresAt) < new Date()) {
      // expire
      await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      throw new Error('Code expiré');
    }

    const salt = (dist.metadata && (dist.metadata as any).salt) || '';
    const expectedHash = crypto.createHash('sha256').update(codeInput + salt).digest('hex');

    const ok = crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(String(dist.verificationCodeHash || ''), 'hex'));

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
    if (allocation.remainingQuantity < dist.quantity) {
      await tx.update(schema.seedDistributions).set({ status: 'FAILED' }).where(eq(schema.seedDistributions.id, distributionId));
      throw new Error('Stock insuffisant lors de la confirmation');
    }

    // decrement stock
    const newRemaining = allocation.remainingQuantity - dist.quantity;
    await tx.update(schema.seedAllocations).set({ remainingQuantity: newRemaining }).where(eq(schema.seedAllocations.id, allocation.id));

    // mark distribution completed
    await tx.update(schema.seedDistributions).set({ status: 'COMPLETED', receiptAt: new Date() }).where(eq(schema.seedDistributions.id, distributionId));

    // audit & trust score bump
    await audit({ actorId: agentUserId, action: 'SEED_DISTRIBUTION_COMPLETED', entityId: distributionId, entityType: 'SEED_DISTRIBUTION', newValue: { allocationId: allocation.id, quantity: dist.quantity } });

    // bump reliabilityIndex (simple +1 heuristic — adjust later)
    const bump = 1.0;
    await tx.execute(sql`UPDATE intelligence.trust_scores SET reliability_index = reliability_index + ${bump} WHERE user_id = ${dist.producerId}`);
    await tx.execute(sql`UPDATE intelligence.trust_scores SET reliability_index = reliability_index + ${bump} WHERE user_id = ${dist.agentId}`);

    return { success: true };
  });
}
