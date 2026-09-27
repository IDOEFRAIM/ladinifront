'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Map, Users, ShoppingCart, Tractor, Loader2, MapPin } from 'lucide-react';
import LocationDetailModal from '@/features/territory/components/LocationDetailModal';
import { useRouter } from 'next/navigation';
import { getClimaticRegions, getLocations, getTerritoryStats, createClimaticRegion, updateClimaticRegion, deleteClimaticRegion, createLocation, toggleLocationActive, deleteLocation } from '@/features/territory/actions/territory.actions';
import KpiCard from '@/features/territory/components/KpiCard';
import toast from 'react-hot-toast';
import { C, F } from '@/features/territory/components/overview/territories.tokens';
import { ClimaticRegionData, LocationData, LocationStat, TerritoryStatsData } from '@/features/territory/components/overview/territories.types';
import { OverviewTab } from '@/features/territory/components/overview/OverviewTab';
import { LocationsTab } from '@/features/territory/components/overview/LocationsTab';
import { RegionsTab } from '@/features/territory/components/overview/RegionsTab';

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
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

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
          producers: z.producers ?? 0,
          orders: z.orders ?? 0,
          farms: z.farms ?? 0,
          gmv: z.gmv ?? 0,
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
  const handleNavigateToLocation = (id: string) => {
    // open detail modal for location
    setSelectedLocationId(id);
  };

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
            <KpiCard icon={<Tractor size={18} />} label="Exploitations" value={stats.locationStats.reduce((a: number, z: LocationStat) => a + (z.farms ?? 0), 0)} color="emerald" trend={5} />
          </div>
        )}

        {selectedLocationId && (
          <LocationDetailModal locationId={selectedLocationId} onClose={() => setSelectedLocationId(null)} />
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
