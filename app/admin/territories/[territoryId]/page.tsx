import TerritoryDetailPage from '@/features/territory/components/TerritoryDetailPage';

export default function Page({ params }: { params: Promise<{ territoryId: string }> }) {
  return <TerritoryDetailPage params={params} />;
}
