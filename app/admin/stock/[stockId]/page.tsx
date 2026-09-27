import StockDetailPage from '@/features/admin/components/AdminStockDetailPage';

export default function Page({ params }: { params: Promise<{ stockId: string }> }) {
  return <StockDetailPage params={params} />;
}
