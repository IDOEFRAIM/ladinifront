import { ProductGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function CatalogueLoading() {
  return (
    <div role="status" aria-label="Chargement du catalogue" style={{ maxWidth: 1280, margin: '0 auto', padding: '48px 20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <Skeleton style={{ height: 32, width: 180, borderRadius: 100 }} />
        <Skeleton style={{ height: 40, width: 'min(420px, 80%)' }} />
      </div>
      <Skeleton style={{ height: 56, borderRadius: 24, marginBottom: 24 }} />
      <ProductGridSkeleton />
    </div>
  );
}
