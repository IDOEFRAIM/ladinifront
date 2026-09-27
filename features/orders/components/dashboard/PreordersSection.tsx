'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, Eye } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { C, F, Card, ActionButton, formatXof } from '@/features/orders/components/dashboard/dashboard-ui';

import type { BuyerPreorder } from '@/features/orders/services/preorder.service';

interface Props {
  preorders: BuyerPreorder[];
}

export default function PreordersSection({ preorders }: Props) {
  const router = useRouter();
  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, marginBottom: 16 }}>Mes précommandes</h2>
      {preorders.length === 0 ? (
        <Card style={{ borderStyle: 'dashed', textAlign: 'center', padding: '36px 20px' }}>
          <Clock size={32} color={C.muted} style={{ opacity: 0.4, marginBottom: 10 }} />
          <p style={{ color: C.muted }}>Aucune précommande pour le moment.</p>
          <Link href="/preorders" style={{ color: C.emerald, fontWeight: 700 }}>Découvrir les futures récoltes</Link>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {preorders.map((po) => (
            <Card key={po.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusBadge status={po.status} type="order" />
                    <span style={{ fontSize: 11, color: C.muted }}>#{po.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.forest, marginTop: 6 }}>{formatXof(po.totalAmount)}</div>
                  {po.marketOffer && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {po.marketOffer.productLabel} • Disponibilité estimée {po.marketOffer.estimatedAvailableAt ? new Date(po.marketOffer.estimatedAvailableAt).toLocaleDateString() : 'à confirmer'}
                    </div>
                  )}
                </div>
                <ActionButton label="Détails" icon={Eye} onClick={() => router.push(`/preorders`)} variant="outline" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
