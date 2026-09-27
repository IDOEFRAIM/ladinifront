"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, Package, Globe } from 'lucide-react';
import { C, F, fmt, KpiCard } from '@/features/admin/components/dashboard/dashboard-ui';
import type { AdminDashboardData } from '@/features/admin/types/admin-dashboard.types';
import { useAdminDashboard } from '@/features/admin/components/dashboard/useAdminDashboard';
import DashboardTopBar from '@/features/admin/components/dashboard/DashboardTopBar';
import ActivityFeedCard from '@/features/admin/components/dashboard/ActivityFeedCard';
import TopZonesPanel from '@/features/admin/components/dashboard/TopZonesPanel';
import CommandCenter from '@/features/admin/components/dashboard/CommandCenter';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function AdminDashboardClient({ initialData, serverRefresh }: { initialData?: AdminDashboardData | null; serverRefresh?: () => Promise<AdminDashboardData | null | undefined> }) {
  const { data, loading, isRefreshing, errorMsg, loadDashboard } = useAdminDashboard(initialData, serverRefresh);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand, gap: 16 }}>
        <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted }}>Initialisation du HQ...</p>
      </div>
    );
  }

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: F.body, color: '#DC2626', fontWeight: 800, fontStyle: 'italic', marginBottom: 8 }}>ERREUR DE SYNCHRONISATION API</p>
        {errorMsg && <p style={{ fontFamily: F.body, color: C.muted, fontSize: 13 }}>{errorMsg}</p>}
        {!errorMsg && <p style={{ fontFamily: F.body, color: C.muted, fontSize: 13 }}>Aucune donnée reçue du serveur.</p>}
      </div>
    </div>
  );

  // Sécurité pour éviter les erreurs si les tableaux sont vides
  const recentActivity = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  const topZones = Array.isArray(data?.topZones) ? data.topZones : [];

  return (
    <div style={{ minHeight: '100vh', background: C.sand, fontFamily: F.body, color: C.text, paddingBottom: 80, paddingTop: 72 }}>

      <DashboardTopBar data={data} isRefreshing={isRefreshing} onRefresh={loadDashboard} />

      <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }} className="lg:p-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 16, marginBottom: 40 }} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="GMV (Revenu)" value={fmt(data.totalRevenue)} sub="FCFA cumules" accent={C.emerald} />
          <KpiCard label="Commandes" value={String(data.totalOrders)} sub={`${data.pendingOrders} a traiter`} accent={C.amber} />
          <KpiCard label="Producteurs" value={String(data.totalProducers)} sub={`${data.activeProducers} valides`} accent={C.forest} isAlert={data.pendingProducers > 0} />
          <KpiCard label="Valeur Moy. Commande" value={data.avgOrderValue ? fmt(data.avgOrderValue) : '-'} sub="Moyenne" accent="#3B82F6" icon={<Package size={16} />} />
          <KpiCard label="Conversion (7j)" value={data.conversion7d ? `${Math.round(data.conversion7d * 100)}%` : '-'} sub="Derniers 7 jours" accent="#8B5CF6" icon={<Globe size={16} />} />
        </motion.div>

        <div style={{ display: 'grid', gap: 40 }} className="grid-cols-1 xl:grid-cols-12">
          <div className="xl:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <ActivityFeedCard recentActivity={recentActivity} />

            <TopZonesPanel topZones={topZones} />
          </div>

          <div className="xl:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <CommandCenter data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
