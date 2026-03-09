// app/actions/inventory.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { audit } from '@/lib/audit';

export async function updateStockAction(actorId: string, stockId: string, newQuantity: number) {
  if (!actorId) throw new Error('NO_ACTOR');
  if (!stockId) throw new Error('NO_STOCK_ID');

  const result = await db.transaction(async (tx) => {
    const [stock] = await tx.update(schema.stocks).set({ quantity: newQuantity }).where(eq(schema.stocks.id, stockId)).returning();

    await tx.insert(schema.auditLogs).values({
      actorId,
      action: 'UPDATE_STOCK',
      entityId: stockId,
      entityType: 'STOCK',
      newValue: { quantity: newQuantity },
    });

    return stock;
  });

  // Top-level audit entry as well
  await audit({ actorId, action: 'UPDATE_STOCK_REQUEST', entityId: stockId, entityType: 'STOCK', newValue: { quantity: newQuantity } });

  return result;
}

export async function fetchProducerInventory(producerId: string) {
  if (!producerId) return null;
  const producer = await db.query.producers.findFirst({
    where: eq(schema.producers.id, producerId),
    with: { farms: { with: { inventory: true } }, products: true },
  });
  return producer ?? null;
}
