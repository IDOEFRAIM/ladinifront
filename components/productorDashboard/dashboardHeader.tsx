'use client';

import React, { useMemo } from 'react';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

const COLOR_PALETTE = ['bg-emerald-600', 'bg-amber-500', 'bg-rose-500', 'bg-slate-400', 'bg-blue-500', 'bg-cyan-500'];

interface HeaderProps {
    activeUnit: string;
    onUnitChange: (id: string) => void;
    units?: { id: string; label: string }[];
}

export default function DashboardHeader({ activeUnit, onUnitChange, units }: HeaderProps) {
    const availableUnits = useMemo(() => {
        const base = [{ id: 'global', label: 'Vue Globale' }, ...(units || [])];
        const unique = base.filter((unit, index) => base.findIndex(u => u.id === unit.id) === index);
        return unique.map((unit, index) => ({
            ...unit,
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
        }));
    }, [units]);

    const currentUnit = availableUnits.find(u => u.id === activeUnit) || availableUnits[0];
    return (
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8">
            
            {/* TITRE DYNAMIQUE */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${currentUnit?.color || 'bg-emerald-600'}`} />
                    <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs font-bold uppercase tracking-wider">
                        Exploitation / {currentUnit?.label}
                    </p>
                </div>
                <h1 style={{ fontFamily: F.heading, color: C.forest, letterSpacing: '-0.02em' }} className="text-3xl md:text-5xl font-black tracking-tight mt-1">
                    {activeUnit === 'global' ? 'Ma Ferme' : currentUnit?.label}
                    <span style={{ color: C.emerald }}>.</span>
                </h1>
            </div>

            {/* SÉLECTEUR DE CULTURE (TACTIQUE) */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl shadow-sm" style={{ border: `1px solid ${C.border}` }}>
                {availableUnits.map((unit) => {
                    const isActive = activeUnit === unit.id;
                    return (
                        <button
                            key={unit.id}
                            onClick={() => onUnitChange(unit.id)}
                            style={{
                                fontFamily: F.body,
                                background: isActive ? C.forest : 'transparent',
                                color: isActive ? C.white : C.muted,
                                boxShadow: isActive ? '0 4px 14px rgba(6,78,59,0.2)' : 'none',
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 hover:bg-black/[0.03]"
                        >
                            {unit.label}
                        </button>
                    );
                })}
            </div>
        </header>
    );
}