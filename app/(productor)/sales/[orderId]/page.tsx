import OrderDetailPage from '@/features/orders/components/ProducerOrderDetailPage';

export default function Page({ params }: { params: Promise<{ orderId: string }> }) {
  return <OrderDetailPage params={params} />;
}
