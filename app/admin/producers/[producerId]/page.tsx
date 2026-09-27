import ProducerDetailPage from '@/features/admin/components/AdminProducerDetailPage';

export default function Page({ params }: { params: Promise<{ producerId: string }> }) {
  return <ProducerDetailPage params={params} />;
}
