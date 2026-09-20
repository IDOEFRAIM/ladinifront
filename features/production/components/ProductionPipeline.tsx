'use client';

import React from 'react';
import { FaSeedling, FaTint, FaClock, FaChartArea, FaCalendarAlt, FaStethoscope } from 'react-icons/fa';

interface ProductionProps {
    activeUnit: string;
}

// Données simulées : Cycles de vie en cours
const PRODUCTION_DATA: Record<string, any[]> = {
    global: [
        { id: 1, type: 'CROP', name: 'Parcelle Nord - Maïs', progress: 65, yield: '15 T', date: '12 Jan', health: 'Bonne' },
        { id: 2, type: 'CROP', name: 'Serre 04 - Tomates Roma', progress: 88, yield: '1.2 T', date: '28 Déc', health: 'Vigilance' },
        { id: 3, type: 'LIVESTOCK', name: 'Lot B-200 Poulets', progress: 42, yield: '200 Unités', date: '15 Fév', health: 'Excellente' },
    ],
    mais: [
        { id: 1, type: 'CROP', name: 'Parcelle Nord - Maïs', progress: 65, yield: '15 T', date: '12 Jan', health: 'Bonne' },
        { id: 4, type: 'CROP', name: 'Parcelle Est - Maïs Douce', progress: 20, yield: '5 T', date: '05 Mars', health: 'Bonne' },
    ],
    tomate: [
        { id: 2, type: 'CROP', name: 'Serre 04 - Tomates Roma', progress: 88, yield: '1.2 T', date: '28 Déc', health: 'Vigilance' },
    ],
    elevage: [
        { id: 3, type: 'LIVESTOCK', name: 'Lot B-200 Poulets', progress: 42, yield: '200 Unités', date: '15 Fév', health: 'Excellente' },
    ]
};

export default function ProductionPipeline({ activeUnit }: ProductionProps) {
    const activeCycles = PRODUCTION_DATA[activeUnit] || PRODUCTION_DATA['global'];

    return (
        <section className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                <FaSeedling size={120} />
            </div>

            {/* EN-TÊTE SECTION */}
            <div className="relative z-10 mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Cycles de Vie Actifs</p>
                </div>
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">Production Vive.</h2>
            </div>

            {/* LISTE DES CYCLES */}
            <div className="relative z-10 space-y-10">
                {activeCycles.map((cycle) => (
                    <div key={cycle.id} className="group cursor-pointer">
                        {/* Infos Titre */}
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <h3 className="text-lg font-black italic uppercase group-hover:text-green-400 transition-colors">
                                    {cycle.name}
                                </h3>
                                <div className="flex gap-4 mt-2">
                                    <span className="flex items-center gap-2 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                        <FaChartArea className="text-white/20" /> Rendement : {cycle.yield}
                                    </span>
                                    <span className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${cycle.health === 'Vigilance' ? 'text-amber-400' : 'text-green-400/60'}`}>
                                        <FaStethoscope /> {cycle.health}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase mb-1">Maturité</p>
                                <p className="text-2xl font-black italic leading-none">{cycle.progress}%</p>
                            </div>
                        </div>

                        {/* Barre de Progression Radicale */}
                        <div className="h-3 bg-white/5 rounded-full p-1 border border-white/10">
                            <div 
                                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                                style={{ width: `${cycle.progress}%` }}
                            />
                        </div>

                        {/* Footer de Carte : Échéance & Action */}
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl">
                                <FaCalendarAlt className="text-white/30" size={10} />
                                <p className="text-[9px] font-black uppercase tracking-widest">Récolte prévue : <span className="text-white">{cycle.date}</span></p>
                            </div>
                            
                            <button className="text-[9px] font-black uppercase tracking-widest border-b border-white/20 pb-1 hover:border-green-400 hover:text-green-400 transition-all">
                                Rapports Techniques
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* MESSAGE D'ÉTAT GLOBAL */}
            <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <FaTint className="text-blue-400 animate-bounce" />
                </div>
                <p className="text-[10px] font-black text-white/50 uppercase leading-relaxed tracking-widest">
                    Système d'irrigation actif sur <span className="text-white">80%</span> des parcelles. <br/>
                    Prochaine maintenance prévue à 18h00.
                </p>
            </div>
        </section>
    );
}