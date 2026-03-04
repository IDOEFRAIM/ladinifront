import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromRequest } from '@/lib/session';
import { requireOrgAction, requireMembershipAndPermission } from '@/lib/api-guard';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const session = await getSessionFromRequest(req as any);
  if (!session?.userId) return new Response('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organizationId, stockId, newQuantity, zoneId } = body;
  if (!organizationId || !stockId || typeof newQuantity !== 'number') return new Response('Bad Request', { status: 400 });

  // 1. Verify membership, jurisdiction and required permission (double-check)
  const { membership, error: permError } = await requireMembershipAndPermission(req as any, organizationId, ['STOCK_EDIT']);
  if (permError) return permError;
  // Also ensure territorial jurisdiction (if zoneId supplied)
  const { error: zoneError } = await requireOrgAction(req as any, organizationId, zoneId);
  if (zoneError) return zoneError;

  // 2. Audit before change
  await audit({
    actorId: session.userId,
    action: 'UPDATE_STOCK_REQUEST',
    entityId: stockId,
    entityType: 'STOCK',
    newValue: { newQuantity }
  });

  // 3. Perform the business change in a transaction for safety
  const result = await db.transaction(async (tx) => {
    const [stock] = await tx.update(schema.stocks).set({ quantity: newQuantity }).where(eq(schema.stocks.id, stockId)).returning();

    await tx.insert(schema.auditLogs).values({
      actorId: session.userId,
      action: 'UPDATE_STOCK',
      entityId: stockId,
      entityType: 'STOCK',
      newValue: { quantity: newQuantity }
    });

    return stock;
  });

  return new Response(JSON.stringify({ success: true, stock: result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
