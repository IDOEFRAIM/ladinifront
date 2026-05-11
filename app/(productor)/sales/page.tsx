import React from 'react';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';
import { RestrictedScreen } from '@/components/productor/tokens';
import OrdersTabs from './OrderTable';

export const dynamic = 'force-dynamic';

function createOrderObject(item: any) {
  const { order, product, quantity, priceAtSale } = item;
  return {
    id: item.orderId,
    customerName: order.buyer?.name || order.customerName || 'Client',
    customerPhone: order.buyer?.phone || order.customerPhone || '',
    location: order.city || order.deliveryDesc || 'Lieu non précisé',
    date: new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    total: 0,
    status: String(order.status || 'PENDING').toLowerCase(),
    items: []
  };
}

function transformOrderItems(orderItems: any[]) {
  const ordersMap = new Map<string, any>();
  for (const item of orderItems) {
    if (!ordersMap.has(item.orderId)) ordersMap.set(item.orderId, createOrderObject(item));
    const order = ordersMap.get(item.orderId);
    order.items.push({ name: item.product.name, quantity: item.quantity });
    order.total += item.quantity * item.priceAtSale;
  }
  return Array.from(ordersMap.values());
}

export default async function OrdersPage() {
  const { user, error } = await requireProducer();
  if (error || !user) return <RestrictedScreen />;
  const producerId = user.producerId as string;

  // Join products -> filter by product.producerId, include order + buyer + product fields
  const rows = await db.select({
    id: schema.orderItems.id,
    orderId: schema.orderItems.orderId,
    productId: schema.orderItems.productId,
    quantity: schema.orderItems.quantity,
    priceAtSale: schema.orderItems.priceAtSale,

    order_id: schema.orders.id,
    order_status: schema.orders.status,
    order_createdAt: schema.orders.createdAt,
    order_customerName: schema.orders.customerName,
    order_customerPhone: schema.orders.customerPhone,
    order_city: schema.orders.city,
    order_deliveryDesc: schema.orders.deliveryDesc,
    order_deliveryStatus: schema.orders.deliveryStatus,
    order_auctionId: schema.orders.auctionId,
    order_winningBidId: schema.orders.winningBidId,

    buyer_name: schema.users.name,
    buyer_phone: schema.users.phone,

    product_name: schema.products.name,
    product_unit: schema.products.unit,
  })
    .from(schema.orderItems)
    .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    .leftJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .leftJoin(schema.buyerProfiles, eq(schema.buyerProfiles.id, schema.orders.buyerId))
    .leftJoin(schema.users, eq(schema.users.id, schema.buyerProfiles.userId))
    .where(eq(schema.products.producerId, producerId))
    .orderBy(desc(schema.orderItems.orderId));

  const orderItems = rows.map((r: any) => ({
    orderId: r.orderId,
    order: {
      id: r.order_id,
      status: r.order_status,
      createdAt: r.order_createdAt,
      customerName: r.order_customerName,
      customerPhone: r.order_customerPhone,
      city: r.order_city,
      deliveryDesc: r.order_deliveryDesc,
      deliveryStatus: r.order_deliveryStatus,
      auctionId: r.order_auctionId,
      winningBidId: r.order_winningBidId,
      buyer: { name: r.buyer_name, phone: r.buyer_phone },
    },
    product: { name: r.product_name, unit: r.product_unit },
    quantity: r.quantity,
    priceAtSale: r.priceAtSale,
  }));

  const allOrders = transformOrderItems(orderItems);
  return <OrdersTabs initialOrders={allOrders} />;
}
