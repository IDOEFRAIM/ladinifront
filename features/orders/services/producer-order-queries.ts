import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { assertTransition } from '@/lib/orderStateMachine';
import { userHasPermission } from '@/features/organization/services/role.service';
import { runOrderStatusHooks } from '@/features/orders/services/order-hooks';

/**
 * Récupère les commandes pour un producteur — single query with nested relations.
 */
export async function fetchProducerOrders(userId?: string) {
  if (!userId) return [];

  const producer = await db.query.producers.findFirst({
    where: eq(schema.producers.userId, userId),
    columns: { id: true },
  });
  if (!producer) return [];

  const producerProducts = await db.select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.producerId, producer.id));

  const productIds = producerProducts.map(p => p.id);
  if (productIds.length === 0) return [];

  const orderItems = await db.query.orderItems.findMany({
    where: inArray(schema.orderItems.productId, productIds),
    with: {
      order: { columns: { id: true, customerName: true, customerPhone: true, city: true, deliveryDesc: true, createdAt: true, status: true } },
      product: { columns: { name: true, unit: true } },
    },
  });

  const ordersMap = new Map<string, { id: string; customerName: string; customerPhone: string; location: string; date: Date; status: string; total: number; items: { name: string; quantity: number; unit: string | null; price: number }[] }>();
  for (const item of orderItems) {
    if (!ordersMap.has(item.orderId)) {
      ordersMap.set(item.orderId, {
        id: item.orderId,
        customerName: item.order.customerName || 'Client',
        customerPhone: item.order.customerPhone || '',
        location: item.order.city || item.order.deliveryDesc || '',
        date: item.order.createdAt,
        status: String(item.order.status ?? 'PENDING').toLowerCase(),
        total: 0,
        items: [],
      });
    }
    const order = ordersMap.get(item.orderId)!;
    order.items.push({
      name: item.product.name,
      quantity: Number(item.quantity),
      unit: item.product.unit,
      price: Number(item.priceAtSale),
    });
    order.total += Number(item.priceAtSale) * Number(item.quantity);
  }

  return Array.from(ordersMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function fetchOrderDetailsForProducer(orderId: string, userId?: string) {
  if (!orderId || !userId) return null;

  const producer = await db.query.producers.findFirst({
    where: eq(schema.producers.userId, userId),
    columns: { id: true },
  });
  if (!producer) return null;

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    columns: { id: true, createdAt: true, updatedAt: true, customerName: true, customerPhone: true, city: true, deliveryDesc: true, status: true },
  });
  if (!order) return null;

  const producerProducts = await db.select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.producerId, producer.id));
  const productIds = producerProducts.map(p => p.id);
  if (productIds.length === 0) return null;

  const filteredItems = await db.query.orderItems.findMany({
    where: (t, { and: $and }) => $and(
      eq(schema.orderItems.orderId, orderId),
      inArray(schema.orderItems.productId, productIds),
    ),
    with: { product: { columns: { name: true, unit: true } } },
  });
  if (filteredItems.length === 0) return null;

  let producerSubtotal = 0;
  const formattedItems = filteredItems.map(item => {
    const price = Number(item.priceAtSale);
    producerSubtotal += Number(item.quantity) * price;
    return { id: item.id, name: item.product.name, quantity: Number(item.quantity), unit: item.product.unit, price };
  });

  return {
    id: order.id,
    customerName: order.customerName || 'Client',
    customerPhone: order.customerPhone || '',
    location: order.city || order.deliveryDesc || '',
    date: order.createdAt,
    total: producerSubtotal,
    status: String(order.status || 'PENDING').toLowerCase(),
    items: formattedItems,
    deliveryFee: 1500,
  };
}

export async function updateOrderStatusAction(orderId: string, newStatus: string, userId?: string) {
  if (!orderId) return null;

  // 1. Load current order to validate transition
  const current = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    columns: { id: true, status: true },
  });
  if (!current) throw new Error('ORDER_NOT_FOUND');

  // 2. State machine guard — throws on invalid transition
  const validatedStatus = assertTransition(current.status as string, newStatus);

  // 3. Ownership / permission check
  if (userId) {
    const producer = await db.query.producers.findFirst({
      where: eq(schema.producers.userId, userId),
      columns: { id: true },
    });
    const producerProducts = await db.select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.producerId, producer?.id ?? ''));
    const productIds = producerProducts.map((p: any) => p.id);

    let ownershipCheck = null;
    if (productIds.length > 0) {
      ownershipCheck = await db.query.orderItems.findFirst({
        where: (t, { and }) => and(
          eq(schema.orderItems.orderId, orderId),
          inArray(schema.orderItems.productId, productIds),
        ),
      });
    }

    if (!ownershipCheck) {
      const canModifyAny = await userHasPermission(userId, 'ORDER_MODIFY_ANY');
      if (!canModifyAny) {
        const e: any = new Error('FORBIDDEN');
        e.code = 'FORBIDDEN';
        throw e;
      }
    }
  }

  // 4. Persist
  const [updated] = await db.update(schema.orders)
    .set({ status: validatedStatus as any })
    .where(eq(schema.orders.id, orderId))
    .returning({ id: schema.orders.id, status: schema.orders.status, updatedAt: schema.orders.updatedAt });

  // 5. Post-transition hooks (delivery creation + buyer notification)
  if (updated) {
    await runOrderStatusHooks(updated.id, validatedStatus);
  }

  return updated;
}
