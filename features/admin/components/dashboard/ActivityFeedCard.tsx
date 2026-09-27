'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { C, F, GlassCard, FeedItem } from '@/features/admin/components/dashboard/dashboard-ui';

import type { AdminActivityItem } from '@/features/admin/types/admin-dashboard.types';

interface Props {
  recentActivity: AdminActivityItem[];
}

export default function ActivityFeedCard({ recentActivity }: Props) {
  return (
  <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: '24px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 800, color: C.forest }}>Flux d Activite</h3>
      <Link href="/admin/orders/kanban" style={{ fontSize: 11, fontWeight: 700, color: C.amber, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voir historique</Link>
    </div>
    <div style={{ padding: 8, maxHeight: 450, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {recentActivity.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Calme plat sur le reseau</div>
      ) : recentActivity.map((activity) => (
        <FeedItem key={activity.id} type={activity.status} title={activity.customerName} desc={activity.producerName} time={new Date(activity.date)} amount={activity.amount} />
      ))}
    </div>
  </GlassCard>
  );
}
