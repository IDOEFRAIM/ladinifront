'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Loader2, Users, Warehouse, Bell, RefreshCw, Package, Globe,
  ShieldCheck, MapPin, ArrowUpRight, Clock
} from 'lucide-react';


const C = {
  forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706',
  sand: '#F9FBF8', glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)',
  muted: '#64748B', text: '#1F2937',
};
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

interface ZoneData { id: string; name: string; region: string; producers: number; orders: number; }
interface Activity { id: string; customerName: string; amount: number; status: string; date: string | Date; zone: string | null; producerName: string | null; }
interface DashboardData {
  totalProducers: number; pendingProducers: number; activeProducers: number;
  totalOrders: number; pendingOrders: number; recentOrders: number;
  totalProducts: number; totalZones: number; activeZones: number; totalRegions: number;
  totalUsers: number; totalRevenue: number; avgOrderValue?: number;
  conversion7d?: number; avgDeliveryHours?: number; aiApprovalRate?: number;
  topZones: ZoneData[]; recentActivity: Activity[];
}

function GlassCard({ children, style = {}, ...rest }: any) {
  return (
    <div style={{
      background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 32, border: `1px solid ${C.border}`, padding: 28,
      transition: 'box-shadow 0.3s', ...style,
    }} {...rest}>{children}</div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get('/api/admin/metrics', { withCredentials: true });
      const result = res.data;
      if (result.success && result.data) {
        const d = result.data as DashboardData;
        if (d.recentActivity && Array.isArray(d.recentActivity)) {
          d.recentActivity = d.recentActivity.map((a: any) => ({ ...a, date: a.date ? new Date(a.date) : a.date }));
        }
        setData(d);
      }
    } catch (e) { /* UI error state */ }
    finally { setLoading(false); setIsRefreshing(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

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
      <p style={{ fontFamily: F.body, color: '#DC2626', fontWeight: 800, fontStyle: 'italic' }}>ERREUR DE SYNCHRONISATION API</p>
    </div>
  );

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  return (
    <div style={{ minHeight: '100vh', background: C.sand, fontFamily: F.body, color: C.text, paddingBottom: 80, paddingTop: 72 }}>

      {/* TOP BAR */}
      <div style={{
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 68,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: '64px', zIndex: 40,
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
              AgriConnect <span style={{ color: C.emerald }}>HQ</span>
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
          <button onClick={loadDashboard} disabled={isRefreshing} style={{
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

      <div style={{ padding: '24px', maxWidth: 1440, margin: '0 auto' }} className="lg:p-10">
        {/* KPI GRID */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 16, marginBottom: 40 }} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="GMV (Revenu)" value={fmt(data.totalRevenue)} sub="FCFA cumules" accent={C.emerald} />
          <KpiCard label="Commandes" value={String(data.totalOrders)} sub={`${data.pendingOrders} a traiter`} accent={C.amber} />
          <KpiCard label="Producteurs" value={String(data.totalProducers)} sub={`${data.activeProducers} valides`} accent={C.forest} isAlert={data.pendingProducers > 0} />
          <KpiCard label="Valeur Moy. Commande" value={data.avgOrderValue ? fmt(data.avgOrderValue) : '-'} sub="Moyenne" accent="#3B82F6" icon={<Package size={16} />} />
          <KpiCard label="Conversion (7j)" value={data.conversion7d ? `${Math.round(data.conversion7d * 100)}%` : '-'} sub="Derniers 7 jours" accent="#8B5CF6" icon={<Globe size={16} />} />
        </motion.div>

        <div style={{ display: 'grid', gap: 40 }} className="grid-cols-1 xl:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="xl:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* ACTIVITY FEED */}
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 800, color: C.forest }}>Flux d Activite</h3>
                <Link href="/admin/orders" style={{ fontSize: 11, fontWeight: 700, color: C.amber, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voir historique</Link>
              </div>
              <div style={{ padding: 8, maxHeight: 450, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.recentActivity.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Calme plat sur le reseau</div>
                ) : data.recentActivity.map((activity) => (
                  <FeedItem key={activity.id} type={activity.status} title={activity.customerName} desc={activity.producerName} time={new Date(activity.date)} amount={activity.amount} zone={activity.zone} />
                ))}
              </div>
            </GlassCard>

            {/* ZONES MAP */}
            <div style={{
              background: C.forest, borderRadius: 32, padding: 40, color: '#fff',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(6,78,59,0.15)',
            }}>
              <div style={{ position: 'relative', zIndex: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 28 }}>Analyse Geographique - Burkina</p>
                <div style={{ display: 'grid', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
                  {data.topZones ?
                  data.topZones.map((zone) => (
                    <div key={zone.id} style={{
                      background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)',
                      padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)',
                      transition: 'background 0.2s',
                    }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', marginBottom: 4 }}>{zone.region}</p>
                      <h5 style={{ fontFamily: F.heading, fontSize: 17, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.02em' }}>{zone.name}</h5>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
                        <div>
                          <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{zone.producers}</p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Prod.</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '1.15rem', fontWeight: 800, color: C.amber }}>{zone.orders}</p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase' }}>Cmds.</p>
                        </div>
                      </div>
                    </div>
                  )):
                  <div>
                    Pas encore de zone,vous pouvez en ajouter 
                    <Link href="/admin/territories" className="text-sm text-white mx-2 hover:underline">
                    ici
                  </Link>
                  </div>
                  
                  }
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="xl:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <GlassCard>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, marginBottom: 20 }}>Centre de Commandes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AdminActionLink href="/admin/producers" icon={<Users size={16} />} label="Gestion Producteurs" count={data.totalProducers} />
                <AdminActionLink href="/admin/stock" icon={<Warehouse size={16} />} label="Stock Central" count={data.totalProducts} />
                <AdminActionLink href="/admin/territories" icon={<MapPin size={16} />} label="Zones & Logistique" count={data.activeZones} />
                <AdminActionLink href="/admin/validations" icon={<ShieldCheck size={16} />} label="Validations KYC" count={data.pendingProducers} highlight={data.pendingProducers > 0} />
              </div>
            </GlassCard>

            {data.pendingProducers > 0 && (
              <div style={{
                background: `linear-gradient(135deg, ${C.amber}, #F59E0B)`, padding: 24, borderRadius: 28,
                color: '#fff', boxShadow: '0 8px 24px rgba(217,119,6,0.2)',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: 4 }}>Action Requise</p>
                <p style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{data.pendingProducers} Producteurs attendent leur validation.</p>
              </div>
            )}

            <GlassCard>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Performance 24h</p>
              <p style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>+{data.recentOrders} Commandes</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, isAlert, icon }: { label: string; value: string; sub: string; accent: string; isAlert?: boolean; icon?: React.ReactNode }) {
  return (
    <GlassCard style={{ padding: '22px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <div style={{ color: accent, opacity: 0.4 }}>{icon || <Package size={16} />}</div>
      </div>
      <span style={{ fontFamily: F.heading, fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>{value}</span>
      <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', marginTop: 4 }}>{sub}</p>
      {isAlert && <span style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'ping 1.5s infinite' }} />}
    </GlassCard>
  );
}

function FeedItem({ type, title, desc, time, amount, zone }: { type: string; title: string; desc: string | null; time: Date; amount?: number; zone?: string | null }) {
  const dotColor = type === 'COMPLETED' ? C.emerald : type === 'CANCELLED' ? '#DC2626' : C.amber;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: 16, transition: 'background 0.2s',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.forest }}>{title}</p>
          <p style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>{desc || 'Sans producteur'}{zone ? ` - ${zone}` : ''}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {amount && <p style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.forest }}>+{new Intl.NumberFormat('fr-FR').format(amount)}</p>}
        <p style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>
          {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function AdminActionLink({ href, icon, label, count, highlight }: { href: string; icon: React.ReactNode; label: string; count: number | string; highlight?: boolean }) {
  return (
    <Link href={href} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderRadius: 16, textDecoration: 'none',
      background: highlight ? 'rgba(217,119,6,0.06)' : 'rgba(6,78,59,0.02)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: highlight ? C.amber : C.muted }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: highlight ? C.forest : C.muted }}>{label}</span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 100,
        background: highlight ? C.amber : 'rgba(255,255,255,0.8)', color: highlight ? '#fff' : C.forest,
        boxShadow: highlight ? 'none' : '0 1px 4px rgba(6,78,59,0.06)',
      }}>{count}</span>
    </Link>
  );
}
