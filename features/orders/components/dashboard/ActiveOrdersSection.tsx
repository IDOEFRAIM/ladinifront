'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Phone, Truck, CheckCircle2, Eye } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { C, F, Card, ActionButton } from '@/features/orders/components/dashboard/dashboard-ui';

import type { BuyerActiveOrder } from '@/features/buyer/types/buyer-dashboard.types';

interface Props {
  activeOrders: BuyerActiveOrder[];
}

export default function ActiveOrdersSection({ activeOrders }: Props) {
  const router = useRouter();
  return (
    <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest }}>Commandes prioritaires</h2>
      <Link href="/orders" style={{ fontSize: 13, fontWeight: 700, color: C.emerald, textDecoration: 'none' }}>Voir tout →</Link>
    </div>

    {activeOrders.length === 0 ? (
      <Card style={{ textAlign: 'center', padding: '40px 20px', background: 'transparent', borderStyle: 'dashed' }}>
        <Package size={40} color={C.muted} style={{ opacity: 0.3, marginBottom: 12 }} />
        <p style={{ color: C.muted, fontWeight: 500 }}>Vous n'avez aucune commande en cours.</p>
        <Link href="/catalogue" style={{ color: C.emerald, fontWeight: 700, fontSize: 14 }}>Parcourir le catalogue</Link>
      </Card>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeOrders.map((order) => (
          <Card key={order.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <StatusBadge status={order.status} type="order" />
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>#{order.id.slice(-6).toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.forest }}>
                  {Number(order.totalAmount).toLocaleString()} CFA
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  {order.items?.length} produit(s) • Commandé le {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ActionButton label="Suivre" icon={Eye} onClick={() => router.push(`/tracking/${order.id}`)} variant="outline" />
                {order.status === 'DELIVERED' && (
                  <ActionButton label="Confirmer" icon={CheckCircle2} onClick={() => {/* API call */}} />
                )}
              </div>
            </div>
            
            {/* Petit stepper de livraison si en cours */}
            {order.delivery && (
              <div style={{ marginTop: 16, padding: '12px', background: C.sand, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <Truck size={16} color={C.emerald} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.forest }}>{order.delivery.status === 'IN_TRANSIT' ? 'En cours de livraison' : 'Prise en charge'}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Livreur : {order.delivery.agent?.user?.name || 'Recherche...'}</div>
                </div>
                <Link href={`tel:${order.delivery.agent?.user?.phone}`} style={{ padding: 8, color: C.forest }}><Phone size={16} /></Link>
              </div>
            )}
          </Card>
        ))}
      </div>
    )}
    </>
  );
}
