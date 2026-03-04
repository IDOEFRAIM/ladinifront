import { OrdersEmptyState, OrdersAccessRequired } from './OrderAcces';
import OrdersList from './OrderList';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

export default async function OrdersPage() {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) return <OrdersAccessRequired />;
  const user: any = { id: ctx.userId, role: ctx.role };

  // Load orders and then load items + products explicitly to avoid relying on relation metadata
  const rawOrders = await db.query.orders.findMany({
    where: eq(schema.orders.buyerId, user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const orderIds = rawOrders.map(o => o.id);
  const rawItems = orderIds.length > 0
    ? await db.query.orderItems.findMany({ where: (t, { inArray }) => inArray(t.orderId, orderIds) })
    : [];

  const productIds = rawItems.map(i => i.productId);
  const products = productIds.length > 0
    ? await db.query.products.findMany({ where: (t, { inArray }) => inArray(t.id, productIds) })
    : [];
  const productMap = new Map(products.map(p => [p.id, p]));

  const orders = rawOrders.map(order => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    items: rawItems.filter(i => i.orderId === order.id).map(item => ({
      ...item,
      priceAtSale: Number(item.priceAtSale),
      product: productMap.get(item.productId) ?? null,
    }))
  }));

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>Mes Commandes</h1>
        <span style={{ background: 'rgba(16,185,129,0.08)', color: C.emerald, padding: '6px 16px', borderRadius: 100, fontFamily: F.body, fontSize: '0.85rem', fontWeight: 700 }}>
          {orders.length} commande{orders.length > 1 ? 's' : ''}
        </span>
      </header>
      {orders.length === 0 ? <OrdersEmptyState /> : <OrdersList orders={orders as any} />}
    </div>
  );
}
