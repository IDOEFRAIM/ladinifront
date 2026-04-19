'use client';

import React, { memo } from 'react';
import { Category } from '@/services/catalogue.service';

// Inline icons to avoid lucide-react node_modules reads on OneDrive
function IconTag({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M20.59 13.41L11.17 4 4 11.17l9.41 9.41a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
        </svg>
    );
}

function IconMap({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M20 6l-5 2-5-2-5 2v10l5-2 5 2 5-2V6z" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
    );
}

function IconRotateCcw({ size = 12 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M3 12a9 9 0 101.79 5.19L3 18V12h6l-1.79 1.79A7 7 0 113 12z" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
    );
}

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
        <span style={{ display:'inline-flex', color:C.muted }}><Icon size={14} /></span>
        {title}
        <div style={{ flex:1, height:1, background:C.border }} />
    </div>
));

function FilterButton({ label, icon, isActive, onClick }: { label: string; icon?: React.ReactNode | null; isActive: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%',
            padding:'12px 16px', background: isActive ? `${C.emerald}14` : 'transparent',
            border:'none', borderRadius:14, color: isActive ? C.forest : C.text, cursor:'pointer',
            transition:'all 0.2s', fontSize:'0.9rem', fontWeight: isActive ? 700 : 500, textAlign:'left', fontFamily:F.body
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = `${C.forest}08`; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                {icon && (typeof icon === 'string' ? <span>{icon}</span> : <>{icon}</>)}
                {label || '—'}
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
                        <IconRotateCcw size={12} /> RESET
                    </button>
                )}
            </div>

            <SectionHeader title="Ressources" icon={IconTag} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {categories.length > 0 ? (
                    categories.filter(cat => !!cat?.key).map((cat) => (
                        <FilterButton
                            key={`category-${cat.key}`}
                            icon={cat.icon as any}
                            label={cat.name}
                            isActive={activeCategory === cat.key}
                            onClick={() => onFilterChange('category', cat.key)}
                        />
                    ))
                ) : (
                    <div style={{ padding:12, color:C.muted, fontSize:'0.8rem', fontStyle:'italic', fontFamily:F.body }}>Chargement des flux...</div>
                )}
            </div>

            <SectionHeader title="Localisation" icon={IconMap} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {regions.length > 0 ? (
                    regions.filter(r => !!r?.id).map((reg) => (
                        <FilterButton
                            key={`region-${reg.id}`}
                            label={reg.name}
                            isActive={activeRegion === reg.id}
                            onClick={() => onFilterChange('region', reg.id)}
                        />
                    ))
                ) : (
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
