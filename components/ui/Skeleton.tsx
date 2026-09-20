// Squelettes de chargement (Server Components, shimmer CSS défini dans app/home.css).
// Ils réservent la place du contenu final → pas de CLS, retour visuel immédiat.
import type { CSSProperties } from 'react';

export function Skeleton({ style, className = '' }: { style?: CSSProperties; className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} style={style} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 20 }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(6,78,59,0.07)', overflow: 'hidden' }}>
          <Skeleton style={{ height: 180, borderRadius: 0 }} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Skeleton style={{ height: 16, width: '70%' }} />
            <Skeleton style={{ height: 12, width: '45%' }} />
            <Skeleton style={{ height: 20, width: '35%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Chargement" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Skeleton style={{ height: 32, width: 240 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} style={{ height: 110, borderRadius: 20 }} />)}
      </div>
      <Skeleton style={{ height: 280, borderRadius: 20 }} />
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement du produit" style={{ maxWidth: 1000, margin: '0 auto', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
      <Skeleton style={{ aspectRatio: '1 / 1', borderRadius: 24 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 36, width: '75%' }} />
        <Skeleton style={{ height: 24, width: '40%' }} />
        <Skeleton style={{ height: 90 }} />
        <Skeleton style={{ height: 52, borderRadius: 100 }} />
      </div>
    </div>
  );
}
