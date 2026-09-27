import { requireProducer } from '@/lib/api-guard';
import { RestrictedScreen } from '@/features/production/components/tokens';
import OrdersTabs from '@/features/orders/components/ProducerOrdersTabs';
import { getProducerOrders } from '@/features/orders/services/producer-orders.service';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  // Protection de la route : producteur connecté uniquement
  const { user, error } = await requireProducer();
  if (error || !user) return <RestrictedScreen />;

  return <OrdersTabs initialOrders={await getProducerOrders(user.producerId as string)} />;
}
