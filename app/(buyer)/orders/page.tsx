import { OrdersEmptyState, OrdersAccessRequired } from './OrderAcces';
import OrdersList from './OrderList';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

export default async function OrdersPage() {
  const { user, error } = await getAuthenticatedUser();
  if (error || !user) return <OrdersAccessRequired />;

  const rawOrders = await prisma.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: { select: { id: true, name: true, unit: true, images: true } } } } }
  });

  const orders = rawOrders.map(order => ({
    ...order,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map(item => ({ ...item, priceAtSale: Number(item.priceAtSale) }))
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
