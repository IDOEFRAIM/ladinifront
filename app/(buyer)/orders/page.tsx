import { OrdersEmptyState, OrdersAccessRequired } from '@/features/orders/components/OrdersAccess';
import BuyerOrdersView from '@/features/orders/components/BuyerOrdersView';
import { getBuyerOrders } from '@/features/orders/services/buyer-orders.service';
import { getAccessContext } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) return <OrdersAccessRequired />;

  const result = await getBuyerOrders(ctx.userId);
  if (result.kind === 'empty') return <OrdersEmptyState />;

  return <BuyerOrdersView orders={result.orders} />;
}
