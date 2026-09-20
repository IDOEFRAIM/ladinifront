import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import crypto from 'crypto';
import { audit } from '@/lib/audit';
import { sql } from 'drizzle-orm';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';
import { MAX_ATTEMPTS } from '@/features/inventory/services/seed-distribution.config';

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
