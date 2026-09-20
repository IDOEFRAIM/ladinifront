'use client';

import { Plus, Search } from 'lucide-react';
import { C, F } from '@/features/territory/components/overview/territories.tokens';
import { ClimaticRegionData, LocationData } from '@/features/territory/components/overview/territories.types';
import { GlassCard } from '@/features/territory/components/overview/TerritoryGlassCard';

export interface LocationsTabProps {
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

export function LocationsTab({ locations, regions, search, showLocationForm, locationForm, onSearchChange, onToggleForm, onLocationFormChange, onCreateLocation, onToggleLocation, onDeleteLocation, onNavigateToLocation }: LocationsTabProps) {
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
