'use client';

import React from 'react';
import { FaWarehouse, FaPlus, FaClock } from 'react-icons/fa';

interface AssetInventoryProps {
    activeUnit: string;
}

// Simulation de données filtrées par culture
const STOCK_DATA: Record<string, any[]> = {
    global: [
        { id: 1, name: 'Maïs Grain', qty: '12.5', unit: 'Tones', value: 2500000, quality: 'Excellente', days: 12 },
        { id: 2, name: 'Tomates', qty: '850', unit: 'Kg', value: 680000, quality: 'Fragile', days: 2 },
        { id: 3, name: 'Oignons', qty: '3.2', unit: 'Tones', value: 1120000, quality: 'Stable', days: 45 },
    ],
    mais: [
        { id: 1, name: 'Maïs Grain Jaune', qty: '8.5', unit: 'Tones', value: 1700000, quality: 'Excellente', days: 10 },
        { id: 4, name: 'Maïs Semence', qty: '4.0', unit: 'Tones', value: 800000, quality: 'Premium', days: 15 },
    ],
    tomate: [
        { id: 2, name: 'Tomates Roma', qty: '850', unit: 'Kg', value: 680000, quality: 'Fragile', days: 2 },
    ]
};

export default function AssetInventory({ activeUnit }: AssetInventoryProps) {
    const assets = STOCK_DATA[activeUnit] || STOCK_DATA['global'];

    return (
        <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#e0e0d1]">
            
            {/* EN-TÊTE DE SECTION */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f7f5ee] rounded-xl flex items-center justify-center text-[#5b4636]">
                        <FaWarehouse size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[#5b4636]">Mon Stock</h2>
                        <p className="text-xs text-[#7c795d]">Produits actuellement stockés</p>
                    </div>
                </div>
                
                <button className="flex items-center gap-2 bg-[#497a3a] hover:bg-[#3d6630] text-white px-4 py-2.5 rounded-xl transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider">Ajouter</span>
                    <FaPlus size={10} />
                </button>
            </div>

            {/* GRILLE D'INVENTAIRE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assets.map((item) => (
                    <div key={item.id} className="p-6 bg-[#f8faf7] rounded-2xl border border-[#e0e0d1] hover:shadow-md transition-shadow duration-300">
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wider mb-1">{item.name}</p>
                                <h3 className="text-3xl font-black text-[#2d3436] tracking-tight">
                                    {item.qty} <span className="text-sm font-bold text-[#7c795d]">{item.unit}</span>
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-[#497a3a] bg-[#e6f4ea] px-3 py-1.5 rounded-lg">
                                    {item.value.toLocaleString()} F
                                </p>
                            </div>
                        </div>

                        {/* INDICATEURS DE SANTÉ DU STOCK */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e0e0d1]">
                            <div className="flex items-center gap-3">
                                <FaClock className="text-[#a4a291]" size={14} />
                                <div>
                                    <p className="text-[10px] font-bold text-[#a4a291] uppercase">Stocké depuis</p>
                                    <p className="text-xs font-bold text-[#5b4636]">{item.days} Jours</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#a4a291] uppercase">Qualité</p>
                                <p className={`text-xs font-bold ${item.quality === 'Fragile' ? 'text-red-500' : 'text-[#497a3a]'}`}>
                                    {item.quality}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}