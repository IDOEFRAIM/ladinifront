'use client';

import Link from 'next/link';
import { C, F, Card } from '@/features/orders/components/dashboard/dashboard-ui';

import type { BuyerAuctionSummary } from '@/features/buyer/types/buyer-dashboard.types';

interface Props {
  auctions: BuyerAuctionSummary;
}

export default function AuctionsSection({ auctions }: Props) {
  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, marginBottom: 16 }}>Vos Enchères Actives</h2>
      {auctions?.active?.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {auctions.active.map((auc) => (
            <Card key={auc.id} style={{ borderBottom: `3px solid ${C.emerald}` }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.forest }}>{auc.subCategory?.name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>Quantité: {auc.quantity}</div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.1)', color: C.emerald, padding: '2px 8px', borderRadius: 6 }}>
                   {auc.bids?.length || 0} offres
                 </span>
                 <Link href={`/auction/${auc.id}`} style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>Gérer →</Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: C.muted }}>Aucune enchère en cours. <Link href="/auction/new" style={{ color: C.forest, fontWeight: 600 }}>Lancer un appel d'offre ?</Link></p>
      )}
    </div>
  );
}
