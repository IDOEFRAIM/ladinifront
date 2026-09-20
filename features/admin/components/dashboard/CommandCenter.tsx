'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Users, Warehouse, MapPin, ShieldCheck } from 'lucide-react';
import { C, GlassCard, AdminActionLink } from '@/features/admin/components/dashboard/dashboard-ui';

import type { AdminDashboardData } from '@/features/admin/types/admin-dashboard.types';

interface Props {
  data: AdminDashboardData;
}

export default function CommandCenter({ data }: Props) {
  return (
    <>
    <GlassCard>
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 20 }}>Centre de Commandes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <AdminActionLink href="/admin/producers" icon={<Users size={16} />} label="Gestion Producteurs" count={data.totalProducers} />
        <AdminActionLink href="/admin/stock" icon={<Warehouse size={16} />} label="Stock Central" count={data.totalProducts} />
        <AdminActionLink href="/admin/territories" icon={<MapPin size={16} />} label="Zones & Logistique" count={data.totalLocations} />
        <AdminActionLink href="/admin/validations" icon={<ShieldCheck size={16} />} label="Validations KYC" count={data.pendingProducers} highlight={data.pendingProducers > 0} />
      </div>
    </GlassCard>

    {data.pendingProducers > 0 && (
      <div style={{
        background: `linear-gradient(135deg, ${C.amber}, #F59E0B)`, padding: 24, borderRadius: 28,
      }}>
        <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Action requise</p>
        <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.7)' }}>Vous avez {data.pendingProducers} producteur(s) en attente de validation.</p>
        <div style={{ marginTop: 12 }}>
          <Link href="/admin/validations" style={{ textDecoration: 'none', fontWeight: 800, color: C.forest }}>Gérer les validations →</Link>
        </div>
      </div>
    )}
    </>
  );
}
