'use client';

import React from 'react';
import { FaArrowUp, FaArrowDown, FaBalanceScale } from 'react-icons/fa';

interface ArbitrageProps {
    activeUnit: string;
}

// Données simulées : Comparaison Marché vs Interne
const MARKET_DATA: Record<string, any> = {
    global: { marketName: "Moyenne Nationale", diff: "+12%", advice: "Vendre Maïs, Stocker Oignons" },
    mais: { marketName: "Marché de Gros Dakar", internal: 550, market: 620, trend: 'up', advice: "Opportunité de profit : +70F/kg" },
    tomate: { marketName: "Marché Local", internal: 800, market: 750, trend: 'down', advice: "Prix en baisse : Vendre immédiatement" },
    elevage: { marketName: "Prix Régional Volaille", internal: 2500, market: 2650, trend: 'stable', advice: "Prix stable : Vendre selon besoin cash" },
};

export default function MarketArbitrage({ activeUnit }: ArbitrageProps) {
    const data = MARKET_DATA[activeUnit] || MARKET_DATA['global'];

    return (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e0d1]">
            
            {/* EN-TÊTE */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#e6f4ea] rounded-xl flex items-center justify-center text-[#497a3a]">
                        <FaBalanceScale size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#5b4636]">Prix du Marché</h2>
                        <p className="text-xs text-[#7c795d]">Comparaison en temps réel</p>
                    </div>
                </div>
            </div>

            {activeUnit === 'global' ? (
                /* VUE GLOBALE - TRENDS */
                <div className="space-y-4">
                    <div className="p-6 bg-[#f7f5ee] rounded-2xl border border-[#e0e0d1]">
                        <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wider mb-2">Tendance Générale</p>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-black text-[#497a3a]">{data.diff}</span>
                            <FaArrowUp className="text-[#497a3a]" size={20} />
                        </div>
                        <p className="mt-3 text-sm font-medium text-[#5b4636]">
                            {data.advice}
                        </p>
                    </div>
                </div>
            ) : (
                /* VUE SPÉCIFIQUE (Maïs, Tomate...) */
                <div className="space-y-4">
                    
                    {/* Carte Principale de Prix */}
                    <div className="p-5 bg-white rounded-2xl border border-[#e0e0d1] shadow-sm">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs text-[#7c795d]">Prix marché actuel</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${data.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {data.trend === 'up' ? '▲ Hausse' : '▼ Baisse'}
                            </span>
                        </div>
                        <p className="text-3xl font-black text-[#5b4636]">
                            {data.market} <span className="text-sm font-normal text-[#7c795d]">F/kg</span>
                        </p>
                        <div className="mt-4 pt-4 border-t border-dashed border-[#e0e0d1] flex justify-between items-center text-xs">
                            <span className="text-[#7c795d]">Votre seuil rentabilité:</span>
                            <span className="font-bold text-[#5b4636]">{data.internal} F/kg</span>
                        </div>
                    </div>

                    {/* Conseil Tactique */}
                    <div className="flex items-start gap-3 p-4 bg-[#e65100]/10 rounded-xl border border-[#e65100]/20">
                        <div className="mt-0.5 text-[#e65100]">
                            <FaArrowUp size={14} />
                        </div>
                        <p className="text-xs font-medium text-[#e65100] leading-snug">
                            {data.advice}
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}