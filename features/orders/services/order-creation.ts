import { db } from '@/src/db';
import { audit } from "@/lib/audit";
import { CreateOrderParams, OrderCreated, mapPaymentMethodCode, validateInventory, createOrderRecord, decrementStock } from '@/features/orders/services/order-creation-helpers';

/**
 * Logique métier centralisée pour créer une commande.
 * ✅ Scopée par organisation (si fournie).
 * ✅ AuditLog à la création.
 * ✅ Transaction atomique (commande + items + décrémentation stock).
 */
export async function createOrderService(data: CreateOrderParams) {
  const mappedPayment = mapPaymentMethodCode(data.paymentMethod);

  const order: OrderCreated = await db.transaction(async (tx: any) => {
    await validateInventory(tx, data.items);
    await decrementStock(tx, data.items);
    const created = await createOrderRecord(tx, data, mappedPayment);
    return created;
  });

  // Audit
  await audit({
    actorId: data.buyerId || 'SYSTEM',
    action: 'CREATE_ORDER',
    entityId: order.id,
    entityType: 'ORDER',
    newValue: { totalAmount: data.totalAmount, items: data.items.length, organizationId: data.organizationId },
  });

  return order;
}
