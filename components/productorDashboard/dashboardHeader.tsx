'use client';

import React from 'react';

// On définit les cultures possibles (ceci viendra sûrement d'une API plus tard)
const CROP_UNITS = [
    { id: 'global', label: 'Vue Globale', color: 'bg-green-600' },
    { id: 'mais', label: 'Maïs Local', color: 'bg-amber-400' },
    { id: 'tomate', label: 'Tomates', color: 'bg-red-500' },
    { id: 'elevage', label: 'Volaille', color: 'bg-slate-400' },
];

interface HeaderProps {
    activeUnit: string;
    onUnitChange: (id: string) => void;
}

export default function DashboardHeader({ activeUnit, onUnitChange }: HeaderProps) {
    // On trouve la culture active pour le titre dynamique
    const currentUnit = CROP_UNITS.find(u => u.id === activeUnit);
console.log("DashboardHeader rendered with activeUnit:", activeUnit);
    return (
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-8">
            
            {/* TITRE DYNAMIQUE */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${currentUnit?.color || 'bg-green-600'}`} />
                    <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wider">
                        Exploitation / {currentUnit?.label}
                    </p>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-[#5b4636] tracking-tight mt-1">
                    {activeUnit === 'global' ? 'Ma Ferme' : currentUnit?.label}
                    <span className="text-[#e65100]">.</span>
                </h1>
            </div>

            {/* SÉLECTEUR DE CULTURE (TACTIQUE) */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl border border-[#e0e0d1] shadow-sm">
                {CROP_UNITS.map((unit) => {
                    const isActive = activeUnit === unit.id;
                    return (
                        <button
                            key={unit.id}
                            onClick={() => onUnitChange(unit.id)}
                            className={`
                                px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
                                ${isActive 
                                    ? 'bg-[#497a3a] text-white shadow-md' 
                                    : 'text-[#7c795d] hover:bg-[#f7f5ee]'
                                }
                            `}
                        >
                            {unit.label}
                        </button>
                    );
                })}
            </div>
        </header>
    );
}