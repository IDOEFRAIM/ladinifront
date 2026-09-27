'use client';

import { Plus } from 'lucide-react';
import { C, F } from '@/features/territory/components/overview/territories.tokens';
import { ClimaticRegionData } from '@/features/territory/components/overview/territories.types';
import { GlassCard } from '@/features/territory/components/overview/TerritoryGlassCard';

export interface RegionsTabProps {
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

export function RegionsTab({ regions, showRegionForm, regionForm, editingRegion, onToggleForm, onRegionFormChange, onCreateRegion, onEditRegion, onDeleteRegion, onCancelEdit, onUpdateRegion }: RegionsTabProps) {
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
