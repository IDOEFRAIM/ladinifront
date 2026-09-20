'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Package, MessageSquare, ShoppingCart } from 'lucide-react';
import { B2BOnly } from '@/features/auth/components/AccountTypeGuard';
import { C, F, Card, SummaryItem, ActionButton, formatXof } from '@/features/orders/components/dashboard/dashboard-ui';

import type { BuyerBillingSummary, BuyerSuggestedProduct } from '@/features/buyer/types/buyer-dashboard.types';

interface Props {
  billingSummary: BuyerBillingSummary | null;
  suggestedProducts: BuyerSuggestedProduct[];
}

export default function DashboardSidebar({ billingSummary, suggestedProducts }: Props) {
  const router = useRouter();
  return (
    <>
    <B2BOnly>
      <div>
        <h3 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Services Pro</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { title: 'Mes Factures', icon: FileText, path: '/billing' },
            { title: 'Commandes Groupées', icon: Package, path: '/bulk' },
            { title: 'Support Prioritaire', icon: MessageSquare, path: '/support' },
          ].map((s) => (
            <div 
              key={s.title}
              onClick={() => router.push(s.path)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', 
                background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
                cursor: 'pointer', transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
            >
              <s.icon size={18} color={C.amber} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.forest }}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>
    </B2BOnly>

    <div>
      <h3 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Facturation XOF</h3>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SummaryItem label="Factures du mois" value={formatXof(billingSummary?.monthTotal)} />
          <SummaryItem label="En attente de paiement" value={formatXof(billingSummary?.pendingTotal)} />
          <SummaryItem label="Déjà réglé" value={formatXof(billingSummary?.paidTotal)} />
          <SummaryItem label="Nombre de factures" value={String(billingSummary?.invoiceCount || 0)} />
          <ActionButton label="Voir mes factures" icon={FileText} onClick={() => router.push('/billing')} />
        </div>
      </Card>
    </div>

    <div>
      <h3 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>Suggestions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {suggestedProducts.slice(0, 3).map((p) => (
          <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 50, height: 50, borderRadius: 8, background: C.sand, overflow: 'hidden', flexShrink: 0 }}>
              <img src={p.images?.[0] || 'images/no_image.webp'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>{Number(p.price).toLocaleString()} CFA</div>
            </div>
            <button style={{ padding: 6, borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.1)', color: C.emerald, cursor: 'pointer' }}>
              <Link href={`/publicProducts/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.emerald, fontSize: 12, fontWeight: 700 }}>
              <ShoppingCart size={14} />
              </Link>
            </button>
          </div>
        ))}
      </div>
    </div>

    </>
  );
}
