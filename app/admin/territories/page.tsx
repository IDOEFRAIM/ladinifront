'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, Map, Users, ShoppingCart, Tractor, Loader2, Plus, Search, ChevronRight, Zap, TrendingUp, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getClimaticRegions, getLocations, getTerritoryStats, createClimaticRegion, updateClimaticRegion, deleteClimaticRegion, createLocation, toggleLocationActive, deleteLocation } from '@/services/territory.service';
import KpiCard from './_components/kpiCard';
import toast from 'react-hot-toast';

const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type ClimaticRegionData = { id: string; name: string; description: string | null; _count: { zones: number } };
type LocationData = { id: string; name: string; code: string; isActive: boolean; climaticRegionId: string; climaticRegion: { name: string }; _count: { producers: number; orders: number; farms: number } };
type LocationStat = { locationId: string; locationName: string; producers: number; orders: number; farms: number; gmv?: number };
type TerritoryStatsData = { totalRegions: number; totalLocations: number; activeLocations: number; totalProducers: number; totalOrders: number; locationStats: LocationStat[] };

function GlassCard({ children, style }: any) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>;
}

interface OverviewTabProps {
  stats: TerritoryStatsData;
  onNavigateToLocation: (id: string) => void;
}

function OverviewTab({ stats, onNavigateToLocation }: OverviewTabProps) {
  const topLocations = useMemo(() => [...stats.locationStats].sort((a, b) => (b.gmv ?? b.orders) - (a.gmv ?? a.orders)).slice(0, 5), [stats]);
  const sleepingLocations = useMemo(() => stats.locationStats.filter(z => (z.orders || 0) === 0), [stats]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <GlassCard style={{ padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} color={C.emerald} /> Top 5 Zones Performantes
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topLocations.map((z, i) => (
            <div key={z.locationId} onClick={() => onNavigateToLocation(z.locationId)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 16, background: 'rgba(6,78,59,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,78,59,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(6,78,59,0.03)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: 10, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</span>
                <span style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading }}>{z.locationName}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{z.orders} cmd</span>
                <span style={{ fontSize: 12, color: C.muted }}>{z.producers} prod.</span>
                <ChevronRight size={16} color={C.muted} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {sleepingLocations.length > 0 && (
        <GlassCard style={{ padding: 28, borderLeft: `4px solid ${C.amber}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: C.amber, fontFamily: F.heading, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} /> Zones Dormantes ({sleepingLocations.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {sleepingLocations.map(z => (
              <span key={z.locationId} onClick={() => onNavigateToLocation(z.locationId)}
                style={{ padding: '6px 16px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', color: C.amber, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {z.locationName}
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

interface LocationsTabProps {
  locations: LocationData[];
  regions: ClimaticRegionData[];
  search: string;
  showLocationForm: boolean;
  locationForm: { name: string; code: string; climaticRegionId: string; latitude: string; longitude: string };
  onSearchChange: (value: string) => void;
  onToggleForm: () => void;
  onLocationFormChange: (field: string, value: string) => void;
  onCreateLocation: () => void;
  onToggleLocation: (id: string) => void;
  onDeleteLocation: (id: string) => void;
  onNavigateToLocation: (id: string) => void;
}

function LocationsTab({ locations, regions, search, showLocationForm, locationForm, onSearchChange, onToggleForm, onLocationFormChange, onCreateLocation, onToggleLocation, onDeleteLocation, onNavigateToLocation }: LocationsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Rechercher une localité..."
            style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 100, border: `1px solid ${C.border}`, background: C.glass, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
        </div>
        <button onClick={onToggleForm}
          style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.body }}>
          <Plus size={16} /> Nouvelle Localité
        </button>
      </div>

      {showLocationForm && (
        <GlassCard style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 16 }}>Créer une localité</h4>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12 }}>
            <input placeholder="Nom" value={locationForm.name} onChange={e => onLocationFormChange('name', e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            <input placeholder="Code" value={locationForm.code} onChange={e => onLocationFormChange('code', e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            <select value={locationForm.climaticRegionId} onChange={e => onLocationFormChange('climaticRegionId', e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }}>
              <option value="">Région climatique</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Latitude" value={locationForm.latitude} onChange={e => onLocationFormChange('latitude', e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
              <input placeholder="Longitude" value={locationForm.longitude} onChange={e => onLocationFormChange('longitude', e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            </div>
          </div>
          <button onClick={onCreateLocation} style={{ marginTop: 16, padding: '10px 28px', borderRadius: 100, border: 'none', background: C.forest, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F.body }}>Créer</button>
        </GlassCard>
      )}

      {locations.filter(z => !search || z.name.toLowerCase().includes(search.toLowerCase())).map(loc => (
        <GlassCard key={loc.id} style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: loc.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', color: loc.isActive ? C.emerald : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: F.heading }}>{loc.code}</div>
              <div>
                <h4 style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading, cursor: 'pointer' }} onClick={() => onNavigateToLocation(loc.id)}>{loc.name}</h4>
                <p style={{ fontSize: 12, color: C.muted }}>{loc.climaticRegion.name}  {loc._count.producers} producteurs</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onToggleLocation(loc.id)} style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: loc.isActive ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.1)', color: loc.isActive ? '#EF4444' : C.emerald, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {loc.isActive ? 'Désactiver' : 'Activer'}
              </button>
              <button onClick={() => onDeleteLocation(loc.id)} style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

interface RegionsTabProps {
  regions: ClimaticRegionData[];
  showRegionForm: boolean;
  regionForm: { name: string; description: string };
  editingRegion: string | null;
  onToggleForm: () => void;
  onRegionFormChange: (field: string, value: string) => void;
  onCreateRegion: () => void;
  onEditRegion: (id: string, region: ClimaticRegionData) => void;
  onDeleteRegion: (id: string) => void;
  onCancelEdit: () => void;
  onUpdateRegion: (id: string) => void;
}

function RegionsTab({ regions, showRegionForm, regionForm, editingRegion, onToggleForm, onRegionFormChange, onCreateRegion, onEditRegion, onDeleteRegion, onCancelEdit, onUpdateRegion }: RegionsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onToggleForm}
          style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: F.body }}>
          <Plus size={16} /> Nouvelle Région
        </button>
      </div>

      {showRegionForm && (
        <GlassCard style={{ padding: 24 }}>
          <h4 style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading, marginBottom: 16 }}>Créer une région climatique</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Nom" value={regionForm.name} onChange={e => onRegionFormChange('name', e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            <input placeholder="Description" value={regionForm.description} onChange={e => onRegionFormChange('description', e.target.value)}
              style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            <button onClick={onCreateRegion} style={{ alignSelf: 'flex-start', padding: '10px 28px', borderRadius: 100, border: 'none', background: C.forest, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: F.body }}>Créer</button>
          </div>
        </GlassCard>
      )}

      {regions.map(region => (
        <GlassCard key={region.id} style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {editingRegion === region.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={regionForm.name} onChange={e => onRegionFormChange('name', e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: 12, border: `1px solid ${C.border}`, fontFamily: F.body }} />
                  <button onClick={() => onUpdateRegion(region.id)} style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: C.emerald, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                  <button onClick={onCancelEdit} style={{ padding: '8px 16px', borderRadius: 100, border: 'none', background: 'rgba(6,78,59,0.06)', color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                </div>
              ) : (
                <>
                  <h4 style={{ fontWeight: 700, color: C.forest, fontFamily: F.heading }}>{region.name}</h4>
                  <p style={{ fontSize: 12, color: C.muted }}>{region.description || 'Aucune description'}  {region._count.zones} localités</p>
                </>
              )}
            </div>
            {editingRegion !== region.id && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onEditRegion(region.id, region)}
                  style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: 'rgba(6,78,59,0.06)', color: C.forest, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Modifier</button>
                <button onClick={() => onDeleteRegion(region.id)}
                  style={{ padding: '6px 16px', borderRadius: 100, border: 'none', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Supprimer</button>
              </div>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

export default function TerritoriesPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<ClimaticRegionData[]>([]);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [stats, setStats] = useState<TerritoryStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'regions'>('overview');
  const [showRegionForm, setShowRegionForm] = useState(false);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [regionForm, setRegionForm] = useState({ name: '', description: '' });
  const [locationForm, setLocationForm] = useState({ name: '', code: '', climaticRegionId: '', latitude: '', longitude: '' });
  const [editingRegion, setEditingRegion] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [regRes, locRes, statsRes] = await Promise.all([getClimaticRegions(), getLocations(), getTerritoryStats()]);
    if (regRes.success && regRes.data) setRegions(regRes.data);
    if (locRes.success && locRes.data) setLocations(locRes.data);
    if (statsRes.success && statsRes.data) {
      const transformedStats = {
        ...statsRes.data,
        locationStats: statsRes.data.locationStats.map((z: any) => ({
          locationId: z.id,
          locationName: z.name,
          producers: z.producers,
          orders: z.orders,
          farms: z.farms
        }))
      };
      setStats(transformedStats);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateRegion = async () => { const res = await createClimaticRegion(regionForm); if (res.success) { toast.success('Région créée'); setRegionForm({ name: '', description: '' }); setShowRegionForm(false); loadData(); } else toast.error('Erreur'); };
  const handleUpdateRegion = async (id: string) => { const res = await updateClimaticRegion(id, regionForm); if (res.success) { toast.success('Région mise à jour'); setEditingRegion(null); loadData(); } else toast.error('Erreur'); };
  const handleDeleteRegion = async (id: string) => { if (!confirm('Supprimer cette région ?')) return; const res = await deleteClimaticRegion(id); if (res.success) { toast.success('Supprimée'); loadData(); } else toast.error('Erreur'); };
  const handleCreateLocation = async () => { const payload = { ...locationForm, latitude: parseFloat(locationForm.latitude) || 0, longitude: parseFloat(locationForm.longitude) || 0 }; const res = await createLocation(payload); if (res.success) { toast.success('Localité créée'); setLocationForm({ name: '', code: '', climaticRegionId: '', latitude: '', longitude: '' }); setShowLocationForm(false); loadData(); } else toast.error('Erreur'); };
  const handleToggleLocation = async (id: string) => { const res = await toggleLocationActive(id); if (res.success) { toast.success('Localité mise à jour'); loadData(); } else toast.error('Erreur'); };
  const handleDeleteLocation = async (id: string) => { if (!confirm('Supprimer cette localité ?')) return; const res = await deleteLocation(id); if (res.success) { toast.success('Supprimée'); loadData(); } else toast.error('Erreur'); };
  const handleNavigateToLocation = (id: string) => router.push(`/admin/territories/${id}`);

  const tabs = [
    { key: 'overview' as const, label: "Vue d'ensemble", icon: <Globe size={16} /> },
    { key: 'locations' as const, label: 'Localités', icon: <Map size={16} /> },
    { key: 'regions' as const, label: 'Régions', icon: <MapPin size={16} /> },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const handleLocationFormChange = (field: string, value: string) => {
    setLocationForm(prev => ({ ...prev, [field]: value }));
  };

  const handleRegionFormChange = (field: string, value: string) => {
    setRegionForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      {/* Header (non-sticky to avoid overlapping global admin header/nav) */}
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '20px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>Gestion Territoriale</h1>
              <p style={{ fontSize: 13, color: C.muted }}>Régions climatiques, zones de collecte et logistique</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(6,78,59,0.04)', borderRadius: 100, padding: 4 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: F.body, transition: 'all 0.2s',
                  background: activeTab === t.key ? C.forest : 'transparent', color: activeTab === t.key ? 'white' : C.muted }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5" style={{ gap: 16, marginBottom: 32 }}>
            <KpiCard icon={<Globe size={18} />} label="Régions Climatiques" value={stats.totalRegions} color="blue" trend={0} />
            <KpiCard icon={<Map size={18} />} label="Localités Actives" value={`${stats.activeLocations}/${stats.totalLocations}`} color="green" trend={2} />
            <KpiCard icon={<Users size={18} />} label="Producteurs" value={stats.totalProducers} color="amber" trend={-1} />
            <KpiCard icon={<ShoppingCart size={18} />} label="Volume Commandes" value={stats.totalOrders} color="indigo" trend={14} />
            <KpiCard icon={<Tractor size={18} />} label="Exploitations" value={stats.locationStats.reduce((a: number, z: LocationStat) => a + z.farms, 0)} color="emerald" trend={5} />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <OverviewTab stats={stats} onNavigateToLocation={handleNavigateToLocation} />
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <LocationsTab
            locations={locations}
            regions={regions}
            search={search}
            showLocationForm={showLocationForm}
            locationForm={locationForm}
            onSearchChange={setSearch}
            onToggleForm={() => setShowLocationForm(!showLocationForm)}
            onLocationFormChange={handleLocationFormChange}
            onCreateLocation={handleCreateLocation}
            onToggleLocation={handleToggleLocation}
            onDeleteLocation={handleDeleteLocation}
            onNavigateToLocation={handleNavigateToLocation}
          />
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <RegionsTab
            regions={regions}
            showRegionForm={showRegionForm}
            regionForm={regionForm}
            editingRegion={editingRegion}
            onToggleForm={() => setShowRegionForm(!showRegionForm)}
            onRegionFormChange={handleRegionFormChange}
            onCreateRegion={handleCreateRegion}
            onEditRegion={(id, region) => { setEditingRegion(id); setRegionForm({ name: region.name, description: region.description || '' }); }}
            onDeleteRegion={handleDeleteRegion}
            onCancelEdit={() => setEditingRegion(null)}
            onUpdateRegion={handleUpdateRegion}
          />
        )}
      </div>
    </div>
  );
}
