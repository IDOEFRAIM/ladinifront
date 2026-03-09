import React from 'react';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireProducer } from '@/lib/api-guard';
import OrdersTabs from './OrderTable';

export const dynamic = 'force-dynamic';

const C = { forest:'#064E3B', emerald:'#10B981', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

function createOrderObject(item: any) {
  const { order, product, quantity, priceAtSale } = item;
  return {
    id: item.orderId,
    customerName: order.buyer?.name || order.customerName || 'Client',
    customerPhone: order.buyer?.phone || order.customerPhone || '',
    location: order.city || order.deliveryDesc || 'Lieu non precise',
    date: new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    total: 0,
    status: (String(order.status || 'PENDING') || 'PENDING').toLowerCase(),
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

const UnauthorizedScreen = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: '40px 32px', textAlign: 'center' as const }}>
      <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest }}>Acces restreint</h2>
      <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.muted, marginTop: 8 }}>Veuillez vous connecter en tant que producteur.</p>
    </div>
  </div>
);

export default async function OrdersPage() {
  const { user, error } = await requireProducer();
  if (error || !user) return <UnauthorizedScreen />;
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

    buyer_name: schema.users.name,
    buyer_phone: schema.users.phone,

    product_name: schema.products.name,
    product_unit: schema.products.unit,
  })
    .from(schema.orderItems)
    .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    .leftJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .leftJoin(schema.users, eq(schema.users.id, schema.orders.buyerId))
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
      buyer: { name: r.buyer_name, phone: r.buyer_phone },
    },
    product: { name: r.product_name, unit: r.product_unit },
    quantity: r.quantity,
    priceAtSale: r.priceAtSale,
  }));

  const allOrders = transformOrderItems(orderItems);
  return <OrdersTabs initialOrders={allOrders} />;
}
