'use client';

import React, { useState, useEffect, useCallback, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaArrowLeft, FaMapMarkerAlt, FaUsers, FaShoppingCart, 
  FaTractor, FaEdit, FaCheck, FaChartLine,
  FaCalendarAlt, FaHistory, FaUserTie, FaExclamationTriangle
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { 
  getLocations, 
  updateLocation, 
  getClimaticRegions 
} from '@/services/territory.service';
import KpiCard from '../_components/kpiCard';
import TerritoryControlCenter from '@/components/admin/TerritoryControlCenter';
import { traceAction } from '@/services/agriPersister';

// ─── Design System Constants (more organic / eco-friendly) ───
const C = {
  glass: 'rgba(250, 252, 248, 0.76)',
  border: 'rgba(14,82,56,0.08)',
  forest: '#0f5132', // deep muted forest
  emerald: '#16a34a', // primary green (softer)
  lime: '#84cc16',
  amber: '#d97706',
  sand: '#FBF9F6', // warm off-white
  muted: '#7C7A72', // earthy muted
  stone900: '#22201d',
};

const F = {
  heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

// ─── Types locaux ───
interface ZoneDetail {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
  climaticRegionId: string;
  climaticRegion: { name: string };
  _count: {
    producers: number;
    orders: number;
    farms: number;
  };
}

export default function TerritoryDetailPage({ params }: { params: Promise<{ territoryId: string }> }) {
  const resolvedParams = use(params);
  const territoryId = resolvedParams.territoryId;
  const router = useRouter();

  // UI state for dynamic header
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [compactHeader, setCompactHeader] = useState(false);

  const {
    loading,
    isEditing,
    setIsEditing,
    zone,
    regions,
    feed,
    displayCounts,
    form,
    setForm,
    handleUpdate,
  } = useTerritoryDetail(territoryId);

  const hasLive = useMemo(() => Array.isArray(feed) && feed.length > 0, [feed]);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset;
      setCompactHeader(y > 120);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!zone) return <NotFoundScreen router={router} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen pb-20 px-4 md:px-12 pt-8" style={{ background: C.sand }}>

      {/* Page header (shrinks on scroll) */}
      <motion.div
        ref={headerRef}
        initial={false}
        animate={{ padding: compactHeader ? '10px 24px' : '20px 24px' }}
        transition={{ duration: 0.22 }}
        style={{ background: C.glass, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, position: 'relative', zIndex: 10 }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(16,150,90,0.08)' }}>
              <FaMapMarkerAlt size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: compactHeader ? 16 : 24, fontWeight: 800, color: C.forest, fontFamily: F.heading, margin: 0 }}>{zone.name}</h1>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{zone.climaticRegion?.name || '—'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasLive && (
                <motion.span animate={{ scale: [1, 1.45, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 10, height: 10, borderRadius: 10, background: C.emerald, boxShadow: `0 0 14px ${C.emerald}33` }} />
              )}
              <div style={{ fontSize: 12, color: C.muted, fontFamily: F.body }}>{hasLive ? 'Activité récente' : 'Aucune activité'}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Sticky actions (animated into view)
          Ensure they sit below Admin top header (64px) + desktop nav (~64px) to avoid overlap. */}
      <div style={{ position: 'sticky', top: 132, zIndex: 18 }}>
        <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.28 }} style={{ padding: '10px 24px', background: C.glass, backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.border}` }}>
          <HeaderActions
            router={router}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            handleUpdate={handleUpdate}
          />
        </motion.div>
      </div>
      <ZoneIdentity
        zone={zone}
        isEditing={isEditing}
        form={form}
        setForm={setForm}
      />
      <KpiDashboard displayCounts={displayCounts} onOpenDiagnostic={() => { setDiagnosticOpen(true); }} />
      <AnimatePresence>
        {diagnosticOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} onClick={() => setDiagnosticOpen(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18 }} style={{ background: '#fff', borderRadius: 16, padding: 20, width: 720, maxWidth: '94%', zIndex: 90 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontWeight: 900 }}>Diagnostic — Score Potentiel</h3>
                <button onClick={() => setDiagnosticOpen(false)} style={{ background: 'transparent', border: 'none', fontWeight: 900 }}>Fermer</button>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <p style={{ color: C.muted }}>Ce diagnostic identifie les principaux freins potentiels à la performance de la zone.</p>
                <ul style={{ marginLeft: 12 }}>
                  <li>• Données sol insuffisantes (capteurs manquants)</li>
                  <li>• Agents terrain sous-équipés</li>
                  <li>• Couverture réseau instable</li>
                </ul>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button style={{ padding: '8px 12px', background: C.emerald, color: '#fff', borderRadius: 8, fontWeight: 900 }} onClick={() => { traceAction({ territoryId, action: 'diagnostic_ack', meta: {} }); setDiagnosticOpen(false); toast.success('Diagnostic tracé'); }}>Accepter plan d'action</button>
                  <button style={{ padding: '8px 12px', background: '#F3F4F6', borderRadius: 8, fontWeight: 800 }} onClick={() => setDiagnosticOpen(false)}>Annuler</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="grid lg:grid-cols-3 gap-10">
        <TerritoryControlCenter territoryId={territoryId} location={zone} feed={feed} />
        <FeedActivity feed={feed} />
        <ZoneSupervisor />
      </div>
    </motion.div>
  );
}

// Custom hooks and components extracted below

function useCounterAnimation(initialValues: { producers: number; orders: number; farms: number }) {
  const [displayCounts, setDisplayCounts] = useState(initialValues);

  const animate = useCallback((key: keyof typeof initialValues, from: number, to: number) => {
    const duration = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (to - from) * t);
      setDisplayCounts(prev => ({ ...prev, [key]: v }));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  return { displayCounts, animate };
}


const getStatChanges = (prev: any, current: any) => {
  if (!prev) return [];
  return Object.keys(current).filter(k => current[k] !== prev[k]);
};

const createFeedItem = (diff: number) => ({
  id: String(Date.now()),
  title: 'Mise à jour activité',
  delta: `${diff >= 0 ? '+' : ''}${diff} cmd`,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});


const mapZoneToForm = (zone: any) => ({
  name: zone.name || '',
  code: zone.code || '',
  latitude: zone.latitude?.toString() || '',
  longitude: zone.longitude?.toString() || '',
  climaticRegionId: zone.climaticRegionId || zone.climaticRegion?.id || ''
});

const extractCounts = (zone: any) => ({
  producers: zone._count?.producers || 0,
  orders: zone._count?.orders || 0,
  farms: zone._count?.farms || 0
});

// 2. HOOK PRINCIPAL
function useTerritoryDetail(territoryId: string) {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [regions, setRegions] = useState<{id: string, name: string}[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [form, setForm] = useState(mapZoneToForm({}));

  const { displayCounts, animate } = useCounterAnimation({ producers: 0, orders: 0, farms: 0 });
  const prevCountsRef = useRef<any>(null);

  // Gère les animations et le feed sans polluer la fonction de fetch
  const handleDataSync = useCallback((newZone: any) => {
    const counts = extractCounts(newZone);
    const changes = getStatChanges(prevCountsRef.current, counts);

    changes.forEach(key => {
      type CountKey = 'producers' | 'orders' | 'farms';
      animate(key as CountKey, prevCountsRef.current[key as CountKey], counts[key as CountKey]);
    });

    if (prevCountsRef.current?.orders !== counts.orders) {
      setFeed(f => [createFeedItem(counts.orders - prevCountsRef.current.orders), ...f].slice(0, 6));
    }
    prevCountsRef.current = counts;
  }, [animate]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [zRes, rRes] = await Promise.all([getLocations(), getClimaticRegions()]);
      const found = zRes.data?.find((z: any) => z.id === territoryId);

      if (found) {
        setZone(found);
        setForm(mapZoneToForm(found));
        handleDataSync(found);
      }
      if (rRes.success && rRes.data) setRegions(rRes.data.map((r: any) => ({ id: r.id, name: r.name })));
    } finally {
      setLoading(false);
    }
  }, [territoryId, handleDataSync]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleUpdate = async () => {
    const loader = toast.loading("Mise à jour...");
    const payload = { 
      ...form, 
      latitude: parseFloat(form.latitude) || 0, 
      longitude: parseFloat(form.longitude) || 0 
    };
    
    const res = await updateLocation(territoryId, payload);
    const isSuccess = res.success;

    toast[isSuccess ? 'success' : 'error'](
      isSuccess ? "Synchronisé" : ('error' in res && typeof res.error === 'string' ? res.error : "Erreur"),
      { id: loader }
    );
    
    if (isSuccess) {
      setIsEditing(false);
      fetchData(true);
    }
  };

  return { loading, isEditing, setIsEditing, zone, regions, feed, displayCounts, form, setForm, handleUpdate };
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.sand }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 rounded-full mb-4" style={{ border: `4px solid ${C.stone900}`, borderTopColor: 'transparent' }} />
      <p style={{ color: C.muted, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 10 }}>Chargement des données...</p>
    </div>
  );
}

function NotFoundScreen({ router }: { router: any }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-20 text-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <FaExclamationTriangle size={56} color={C.amber} style={{ display: 'block', margin: '0 auto 18px' }} />
        <h2 style={{ fontSize: 28, fontWeight: 900, color: C.stone900 }}>Zone Introuvable</h2>
        <button onClick={() => router.push('/territories')} className="mt-8 px-8 py-3 rounded-2xl font-black" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: '#fff' }}>RETOUR</button>
      </motion.div>
    </div>
  );
}

function HeaderActions({ router, isEditing, setIsEditing, handleUpdate }: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <button onClick={() => router.back()} className="flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest" style={{ color: C.muted }}>
        <FaArrowLeft /> RETOUR
      </button>
      <div className="flex gap-4">
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.button 
              key="edit" onClick={() => setIsEditing(true)}
              className="transition-all"
              style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: '#fff', borderRadius: 28, fontWeight: 900, boxShadow: '0 10px 30px rgba(16,150,90,0.10)' }}
            >
              MODIFIER
            </motion.button>
          ) : (
            <motion.div key="save" className="flex gap-3">
              <button onClick={handleUpdate} className="px-8 py-3 rounded-2xl font-black flex items-center gap-2" style={{ background: C.emerald, color: '#fff', boxShadow: '0 10px 28px rgba(22,163,74,0.14)' }}>
                <FaCheck /> SAUVEGARDER
              </button>
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 rounded-2xl font-black" style={{ background: 'transparent', color: C.muted, border: '1px solid rgba(0,0,0,0.04)' }}>ANNULER</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ZoneIdentity({ zone, isEditing, form, setForm }: any) {
  return (
    <div style={{ background: C.glass, border: `1px solid ${C.border}`, borderRadius: 40, padding: 40, position: 'relative', overflow: 'hidden', marginBottom: 32, boxShadow: '0 12px 40px rgba(16,150,90,0.06)' }}>
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }} className="md:flex-row md:flex md:items-center md:gap-8">
        <div style={{ width: 128, height: 128, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontWeight: 900, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, boxShadow: '0 18px 40px rgba(16,150,90,0.08)' }}>
          {zone.code}
        </div>
        <div style={{ flex: 1, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ padding: '8px 14px', borderRadius: 999, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', background: zone.isActive ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: zone.isActive ? 'rgba(22,163,74,0.9)' : 'rgba(220,38,38,0.9)' }}>{zone.isActive ? 'Opérationnelle' : 'Inactive'}</span>
            <span style={{ color: C.muted, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaMapMarkerAlt style={{ color: C.forest }} /> {zone.climaticRegion?.name}
            </span>
          </div>
          {isEditing ? (
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ width: '100%', fontSize: 36, fontWeight: 900, color: C.stone900, borderBottom: '4px solid rgba(0,0,0,0.04)', outline: 'none', background: 'transparent', fontStyle: 'italic' }} />
          ) : (
            <h1 style={{ fontSize: 56, fontWeight: 900, color: C.stone900, letterSpacing: '-0.02em', fontStyle: 'italic', textTransform: 'uppercase' }}>{zone.name}</h1>
          )}
        </div>
      </div>
    </div>
  );
}




function KpiDashboard({ displayCounts, onOpenDiagnostic, traceAction }: any) {
  
  // 1. Définition de la structure des KPIs
  const kpiConfigs = [
    {
      id: 'producers',
      label: "Producteurs",
      value: displayCounts.producers,
      icon: <FaUsers />,
      color: "blue",
      trend: 5,
    },
    {
      id: 'orders',
      label: "Volume Commandes",
      value: displayCounts.orders,
      icon: <FaShoppingCart />,
      color: "green",
      trend: 12,
    },
    {
      id: 'farms',
      label: "Fermes Actives",
      value: displayCounts.farms,
      icon: <FaTractor />,
      color: "amber",
      trend: 2,
    },
    {
      id: 'score',
      label: "Score Potentiel",
      value: "88/100",
      icon: <FaChartLine />,
      color: "indigo",
      trend: 0,
      onClick: onOpenDiagnostic, // Action spécifique pour le score
    },
  ];

  // 2. Rendu via itération
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      {kpiConfigs.map((kpi) => (
        <div
          key={kpi.id}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (kpi.onClick) kpi.onClick();
            traceAction({ action: 'kpi_click', meta: { kpi: kpi.id } });
          }}
        >
          <KpiCard 
            icon={kpi.icon} 
            label={kpi.label} 
            value={kpi.value} 
            color={kpi.color} 
            trend={kpi.trend} 
          />
        </div>
      ))}
    </div>
  );
}

function GeoLogistics({ zone, isEditing, form, setForm }: any) {
  return (
    <div className="lg:col-span-1 space-y-8">
      <div className="bg-white rounded-4xl border-2 border-stone-100 p-8">
        <h3 className="text-xs font-black text-stone-900 uppercase tracking-[0.2em] mb-8 border-l-4 border-green-800 pl-4">Géolocalisation</h3>
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Latitude</span>
            {isEditing ? (
              <input type="number" value={form.latitude} onChange={e => setForm({...form, latitude: e.target.value})} className="w-24 text-right bg-white border-2 border-stone-100 rounded-lg px-2 py-1 text-sm font-black" />
            ) : (
              <span className="font-black text-stone-800">{zone.latitude ?? '—'}</span>
            )}
          </div>
          <div className="flex justify-between items-center p-4 bg-stone-50 rounded-2xl">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-tighter">Longitude</span>
            {isEditing ? (
              <input type="number" value={form.longitude} onChange={e => setForm({...form, longitude: e.target.value})} className="w-24 text-right bg-white border-2 border-stone-100 rounded-lg px-2 py-1 text-sm font-black" />
            ) : (
              <span className="font-black text-stone-800">{zone.longitude ?? '—'}</span>
            )}
          </div>
        </div>
        <div className="aspect-square bg-stone-100 rounded-4xl border-4 border-white shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 grayscale" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")'}} />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-700/30 animate-pulse flex items-center justify-center">
              <FaMapMarkerAlt className="text-green-800 text-2xl" />
            </div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Map Engine Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedActivity({ feed }: any) {
  const [filter, setFilter] = useState<'all' | 'logistique' | 'production' | 'alerts'>('all');
  const [localFeed, setLocalFeed] = useState(feed || []);

  // keep local feed in sync when parent feed updates
  useEffect(() => setLocalFeed(feed || []), [feed]);

  const handleValidate = async (evt: any) => {
    // optimistic remove
    setLocalFeed((f:any) => f.filter((x: any) => x.id !== evt.id));
    await traceAction({ territoryId: (evt.meta && evt.meta.territoryId) || 'unknown', action: 'validate_event', meta: { eventId: evt.id } });
    toast.success('Événement validé');
  };

  const handleCall = async (evt: any) => {
    await traceAction({ territoryId: (evt.meta && evt.meta.territoryId) || 'unknown', action: 'call_agent', meta: { eventId: evt.id } });
    toast('Appel en cours…');
  };

  const filtered = localFeed.filter((f: any) => {
    if (filter === 'all') return true;
    // improved inference: prefer explicit meta.type/category/tags, fallback to regex on title
    const inferCategory = (evt: any) => {
      const title = String(evt.title || '').toLowerCase();
      const metaType = String(evt.meta?.type || evt.meta?.category || evt.meta?.kind || '').toLowerCase();
      const tags = Array.isArray(evt.meta?.tags) ? evt.meta.tags.map((t: any) => String(t).toLowerCase()).join(' ') : '';
      const combined = `${title} ${metaType} ${tags} ${JSON.stringify(evt.meta || {})}`;

      if (/(alerte|anomalie|offline|hors ligne|alert|anomaly|critical)/i.test(combined)) return 'alerts';
      if (/(ma[iî]s|mais|rendement|récolte|recolte|ferme|crop|harvest|yield)/i.test(combined)) return 'production';
      if (/(commande|collecte|livraison|cmd|point de collecte|logistique|logistics|pickup|delivery|order)/i.test(combined)) return 'logistique';
      return 'other';
    };

    const cat = inferCategory(f);
    if (filter === 'alerts') return cat === 'alerts';
    if (filter === 'production') return cat === 'production';
    if (filter === 'logistique') return cat === 'logistique';
    return true;
  });

  return (
    <div className="lg:col-span-2 space-y-8">
      <div className="bg-white rounded-4xl border-2 border-stone-100 overflow-hidden">
        <div className="p-6 border-b border-stone-50 flex items-center justify-between" style={{ background: 'rgba(250,250,248,0.6)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <h3 className="font-black text-stone-900 uppercase tracking-tight flex items-center gap-3"><FaHistory className="text-green-800" /> Flux d'Actions</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setFilter('all')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'all' ? C.emerald : 'transparent', color: filter === 'all' ? '#fff' : C.muted, fontWeight: 800 }}>Tous</button>
              <button onClick={() => setFilter('logistique')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'logistique' ? '#F0FDF4' : 'transparent', color: C.muted, fontWeight: 800 }}>Logistique</button>
              <button onClick={() => setFilter('production')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'production' ? '#FFF7ED' : 'transparent', color: C.muted, fontWeight: 800 }}>Production</button>
              <button onClick={() => setFilter('alerts')} style={{ padding: '6px 8px', borderRadius: 8, background: filter === 'alerts' ? '#FEF3F2' : 'transparent', color: C.muted, fontWeight: 800 }}>Alertes</button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald, boxShadow: `0 6px 18px ${C.emerald}22` }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: C.stone900, textTransform: 'uppercase' }}>Live</span>
          </div>
        </div>
        <div className="divide-y divide-stone-50">
          <AnimatePresence initial={false}>
            {filtered.map((evt: any) => (
              <motion.div 
                key={evt.id} 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="p-6 flex items-center justify-between hover:bg-stone-50/80 transition-all cursor-default group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-white border-2 border-stone-100 rounded-xl flex items-center justify-center text-stone-400 group-hover:text-green-800 group-hover:border-green-800 transition-all">
                    <FaCalendarAlt size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-stone-800 uppercase tracking-tight">{evt.title}</div>
                    <div className="text-[10px] text-stone-400 font-bold uppercase italic">{evt.meta?.location || 'Point de collecte'} • {evt.time}</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-sm font-black text-stone-900">{evt.delta}</div>
                    <div className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">{evt.meta?.status || 'Nouveau'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleValidate(evt)} style={{ padding: '6px 8px', borderRadius: 8, background: '#ECFEF0', fontWeight: 800 }} title="Valider">Valider</button>
                    <button onClick={() => handleCall(evt)} style={{ padding: '6px 8px', borderRadius: 8, background: '#FEF3C7', fontWeight: 800 }} title="Appeler">Appeler</button>
                    <button onClick={() => { traceAction({ territoryId: evt.meta?.territoryId || 'unknown', action: 'view_details', meta: { eventId: evt.id } }); toast('Ouverture détails…'); }} style={{ padding: '6px 8px', borderRadius: 8, background: '#F3F4F6', fontWeight: 800 }}>Détails</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ZoneSupervisor() {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.forest}, ${C.emerald})`, borderRadius: 28, padding: 24, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.04)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.08)' }}>
          <FaUserTie size={28} style={{ color: 'rgba(255,255,255,0.9)' }} />
        </div>
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>Superviseur de Zone</h4>
          <p style={{ fontSize: 18, fontWeight: 900, fontStyle: 'italic' }}>Agent Terrain Sénior</p>
        </div>
      </div>
      <button style={{ padding: '10px 18px', background: '#fff', color: C.forest, borderRadius: 12, fontWeight: 900, textTransform: 'uppercase', fontSize: 10 }}>Message</button>
    </div>
  );
}