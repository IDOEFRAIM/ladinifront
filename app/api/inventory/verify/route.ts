import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { db, schema } from '@/src/db';
import { eq, sql } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { buildAccessContext } from '@/lib/access-context';
import { AccessManager } from '@/lib/access-manager';
import { PERMISSIONS } from '@/lib/permissions';

export async function POST(req: Request) {
  const body = await req.json();
  const { distributionId, code, ipAddress } = body;
  if (!distributionId || !code) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const ctx = await buildAccessContext(session.userId);

  // load distribution
  const dist = await db.select().from(schema.seedDistributions).where(eq(schema.seedDistributions.id, distributionId)).limit(1);
  const row = dist[0];
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.status !== 'PENDING') return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  if (row.verificationCodeExpiresAt && new Date(row.verificationCodeExpiresAt) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 400 });
  }

  const salt = (row.metadata as Record<string, unknown>)?.salt as string | undefined;
  if (!salt || !row.verificationCodeHash) return NextResponse.json({ error: 'no_code' }, { status: 400 });

  const candidate = createHash('sha256').update(salt + code).digest('hex');
  const match = timingSafeEqual(Buffer.from(candidate), Buffer.from(row.verificationCodeHash));

  // authorization: allow if the caller is the producer, otherwise require permission
  const isProducer = ctx.producerId && ctx.producerId === row.producerId;
  if (!isProducer) {
    const authResp = AccessManager.can(ctx)
      .permission(PERMISSIONS.STOCK_VERIFY)
      .inOrg(row.organizationId)
      .inZone(row.zoneId)
      .toResponse();
    if (authResp) return authResp;
  }

  // record attempt
  await db.insert(schema.seedDistributionAttempts).values({
    distributionId,
    actorId: session.userId,
    attemptType: 'CODE_VERIFY',
    success: match,
    ipAddress,
    metadata: null,
    createdAt: new Date(),
  });

  if (!match) {
    // increment attempts_count
    await db.update(schema.seedDistributions).set({ attemptsCount: row.attemptsCount + 1 }).where(eq(schema.seedDistributions.id, distributionId));
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // success: mark completed and decrement allocation remainingQuantity in a simple sequence
  await db.transaction(async (tx) => {
    // decrement allocation
    await tx.update(schema.seedAllocations).set({ remainingQuantity: sql`${schema.seedAllocations.remainingQuantity} - ${row.quantity}` }).where(eq(schema.seedAllocations.id, row.allocationId));
    // mark distribution completed
    await tx.update(schema.seedDistributions).set({ status: 'COMPLETED', receiptAt: new Date() }).where(eq(schema.seedDistributions.id, distributionId));
  });

  return NextResponse.json({ ok: true });
}
