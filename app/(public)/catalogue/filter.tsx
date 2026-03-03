'use client';

import React, { memo } from 'react';
import { Category } from '@/services/catalogue.service';
import { Map, Tag, RotateCcw } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

interface UnifiedFilterProps {
    categories: Category[];
    regions: { id: string; name: string }[];
    activeCategory: string;
    activeRegion: string;
    onFilterChange: (type: 'category' | 'region', value: string) => void;
    onReset: () => void;
}

const SectionHeader = memo(({ title, icon: Icon }: { title: string; icon: any }) => (
    <div style={{ fontSize:'0.7rem', fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'1.2px', margin:'28px 0 12px', display:'flex', alignItems:'center', gap:8, fontFamily:F.body }}>
        <Icon size={14} strokeWidth={2.5} />
        {title}
        <div style={{ flex:1, height:1, background:C.border }} />
    </div>
));

function FilterButton({ label, icon, isActive, onClick }: { label: string; icon?: string | null; isActive: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
            padding:'12px 16px', background: isActive ? `${C.emerald}14` : 'transparent',
            border:'none', borderRadius:14, color: isActive ? C.forest : C.text, cursor:'pointer',
            transition:'all 0.2s', fontSize:'0.9rem', fontWeight: isActive ? 700 : 500, textAlign:'left', fontFamily:F.body
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${C.forest}08`; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
        >
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                {icon && <span>{icon}</span>}
                {label}
            </span>
            {isActive && <div style={{ width:6, height:6, borderRadius:'50%', background:C.emerald, boxShadow:`0 0 8px ${C.emerald}` }} />}
        </button>
    );
}

export default function UnifiedFilter({ categories = [], regions = [], activeCategory, activeRegion, onFilterChange, onReset }: UnifiedFilterProps) {
    const isFiltered = activeCategory !== 'all' || activeRegion !== 'all';

    return (
        <nav style={{ background:C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:`1px solid ${C.border}`, padding:28, borderRadius:24, boxShadow:'0 8px 32px rgba(6,78,59,0.06)', position:'sticky', top:40, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <h3 style={{ margin:0, fontSize:'1.25rem', fontWeight:800, color:C.text, letterSpacing:'-0.5px', fontFamily:F.heading }}>Configuration</h3>
                {isFiltered && (
                    <button onClick={onReset} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.7rem', color:C.forest, background:'none', border:`1.5px solid ${C.forest}`, padding:'6px 10px', borderRadius:8, cursor:'pointer', fontWeight:800, fontFamily:F.body }}>
                        <RotateCcw size={12} /> RESET
                    </button>
                )}
            </div>

            <SectionHeader title="Ressources" icon={Tag} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {categories.length > 0 ? categories.map(cat => (
                    <FilterButton key={cat.key} icon={cat.icon} label={cat.name} isActive={activeCategory === cat.key} onClick={() => onFilterChange('category', cat.key)} />
                )) : (
                    <div style={{ padding:12, color:C.muted, fontSize:'0.8rem', fontStyle:'italic', fontFamily:F.body }}>Chargement des flux...</div>
                )}
            </div>

            <SectionHeader title="Localisation" icon={Map} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {regions.length > 0 ? regions.map(reg => (
                    <FilterButton key={reg.id} label={reg.name} isActive={activeRegion === reg.id} onClick={() => onFilterChange('region', reg.id)} />
                )) : (
                    <div style={{ padding:12, color:C.muted, fontSize:'0.8rem', fontStyle:'italic', fontFamily:F.body }}>Chargement des localités...</div>
                )}
            </div>

            <div style={{ marginTop:32, padding:16, borderRadius:16, background:`${C.emerald}08`, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.7rem', fontWeight:700, color:C.emerald, fontFamily:F.body }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:C.emerald }} />
                    DONNÉES TEMPS RÉEL
                </div>
                <p style={{ margin:0, fontSize:'0.7rem', color:C.muted, lineHeight:1.4, fontFamily:F.body }}>
                    Fréquence de rafraîchissement : <span style={{ color:C.text, fontWeight:600 }}>15 min</span>
                </p>
            </div>
        </nav>
    );
}
