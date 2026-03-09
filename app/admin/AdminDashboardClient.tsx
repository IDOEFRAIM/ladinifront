"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Loader2, Users, Warehouse, Bell, RefreshCw, Package, Globe,
  ShieldCheck, MapPin
} from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706',
  sand: '#F9FBF8', glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)',
  muted: '#64748B', text: '#1F2937',
};
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

function GlassCard({ children, style = {}, ...rest }: any) {
  return (
    <div style={{
      background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 32, border: `1px solid ${C.border}`, padding: 28,
      transition: 'box-shadow 0.3s', ...style,
    }} {...rest}>{children}</div>
  );
}

export default function AdminDashboardClient({ initialData, serverRefresh }: any) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (serverRefresh) {
        const res = await serverRefresh();
        setData(res || null);
      } else {
        const res = await axios.get('/api/admin/metrics', { withCredentials: true });
        const result = res.data;
        if (result && result.success && result.data) {
          setData(result.data);
        } else {
          console.warn('Dashboard API returned unexpected payload:', result);
          setErrorMsg((result && result.error) ? String(result.error) : 'Réponse API inattendue');
        }
      }
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Failed loading admin metrics:', err?.message || err, err?.response?.status, err?.response?.data);
      const msg = err?.response?.data?.error || err?.message || 'Erreur réseau';
      setErrorMsg(String(msg));
    } finally { setLoading(false); setIsRefreshing(false); }
  }, [serverRefresh]);

  useEffect(() => { if (!initialData) loadDashboard(); }, [initialData, loadDashboard]);

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

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

  // Helper components (KpiCard, FeedItem, AdminActionLink) could be extracted but kept inline for brevity
  const KpiCard = ({ label, value, sub, accent, icon, isAlert = false }: any) => (
    <div style={{ background: 'white', borderRadius: 16, padding: 18, border: '1px solid rgba(6,78,59,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>{label}</p>
          <h3 style={{ fontFamily: F.heading, fontWeight: 900, marginTop: 8 }}>{value}</h3>
          <p style={{ fontSize: 12, color: '#6B7280' }}>{sub}</p>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: accent || '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon || null}
        </div>
      </div>
    </div>
  );

  const FeedItem = ({ type, title, desc, time, amount, zone }: any) => (
    <div style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid rgba(6,78,59,0.03)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontWeight: 800 }}>{title}</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>{desc}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: 800 }}>{amount} FCFA</p>
            <p style={{ fontSize: 11, color: '#6B7280' }}>{time.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const AdminActionLink = ({ href, icon, label, count, highlight }: any) => (
    <Link href={href} style={{ display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: '#111' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 12, fontWeight: 800 }}>{label}</p>
        <p style={{ fontSize: 12, color: '#6B7280' }}>{count}</p>
      </div>
      {highlight && <div style={{ background: '#DC2626', color: '#fff', padding: '4px 8px', borderRadius: 8, fontWeight: 800 }}>!</div>}
    </Link>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, fontFamily: F.body, color: C.text, paddingBottom: 80, paddingTop: 72 }}>

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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'grid', gap: 16, marginBottom: 40 }} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="GMV (Revenu)" value={fmt(data.totalRevenue)} sub="FCFA cumules" accent={C.emerald} />
          <KpiCard label="Commandes" value={String(data.totalOrders)} sub={`${data.pendingOrders} a traiter`} accent={C.amber} />
          <KpiCard label="Producteurs" value={String(data.totalProducers)} sub={`${data.activeProducers} valides`} accent={C.forest} isAlert={data.pendingProducers > 0} />
          <KpiCard label="Valeur Moy. Commande" value={data.avgOrderValue ? fmt(data.avgOrderValue) : '-'} sub="Moyenne" accent="#3B82F6" icon={<Package size={16} />} />
          <KpiCard label="Conversion (7j)" value={data.conversion7d ? `${Math.round(data.conversion7d * 100)}%` : '-'} sub="Derniers 7 jours" accent="#8B5CF6" icon={<Globe size={16} />} />
        </motion.div>

        <div style={{ display: 'grid', gap: 40 }} className="grid-cols-1 xl:grid-cols-12">
          <div className="xl:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '24px 28px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontFamily: F.heading, fontSize: 16, fontWeight: 800, color: C.forest }}>Flux d Activite</h3>
                <Link href="/admin/orders" style={{ fontSize: 11, fontWeight: 700, color: C.amber, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Voir historique</Link>
              </div>
              <div style={{ padding: 8, maxHeight: 450, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.recentActivity.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: C.muted, fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Calme plat sur le reseau</div>
                ) : data.recentActivity.map((activity: any) => (
                  <FeedItem key={activity.id} type={activity.status} title={activity.customerName} desc={activity.producerName} time={new Date(activity.date)} amount={activity.amount} zone={activity.zone} />
                ))}
              </div>
            </GlassCard>

            <div style={{
              background: C.forest, borderRadius: 32, padding: 40, color: '#fff',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(6,78,59,0.15)',
            }}>
              <div style={{ position: 'relative', zIndex: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 28 }}>Analyse Geographique - Burkina</p>
                <div style={{ display: 'grid', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
                  {data.topZones ? data.topZones.map((zone: any) => (
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
                  )) : (
                    <div>
                      Pas encore de zone,vous pouvez en ajouter 
                      <Link href="/admin/territories" className="text-sm text-white mx-2 hover:underline">ici</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
