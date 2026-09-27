'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link';
import { Bell, RefreshCw, ShieldCheck } from 'lucide-react';
import { C, F } from '@/features/admin/components/dashboard/dashboard-ui';

import type { AdminDashboardData } from '@/features/admin/types/admin-dashboard.types';

interface Props {
  data: AdminDashboardData;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function DashboardTopBar({ data, isRefreshing, onRefresh }: Props) {
  return (
  <div style={{
    background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 68,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    position: 'relative', zIndex: 10,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 14,
        background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        boxShadow: '0 4px 12px rgba(6,78,59,0.15)',
      }}>
        <ShieldCheck size={18} />
      </div>
      <div>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>
          Ladini <span style={{ color: C.emerald }}>HQ</span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.emerald, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>
            {data.totalUsers} Utilisateurs actifs {isRefreshing ? '- Mise a jour...' : '- Systeme Nominal'}
          </p>
        </div>
      </div>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Link href="/admin/validations" style={{
        position: 'relative', padding: 10, borderRadius: 14,
        background: 'rgba(217,119,6,0.08)', color: C.amber,
        display: 'flex', alignItems: 'center', textDecoration: 'none',
      }}>
        <Bell size={18} />
        {data.pendingProducers > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 18, height: 18,
            background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 800,
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>{data.pendingProducers}</span>
        )}
      </Link>
      <button onClick={onRefresh} disabled={isRefreshing} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
        background: C.forest, color: '#fff', borderRadius: 100, border: 'none',
        cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 700,
        opacity: isRefreshing ? 0.6 : 1, transition: 'all 0.2s',
      }}>
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        {isRefreshing ? 'Sync...' : 'Actualiser'}
      </button>
    </div>
  </div>
  );
}
