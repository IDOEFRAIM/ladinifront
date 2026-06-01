'use client';

import React from 'react';
import Link from 'next/link';
import { FaWarehouse, FaPlus, FaClock } from 'react-icons/fa';
import type { InventoryAsset } from '@/hooks/useInventory';

interface AssetInventoryProps {
    assets: InventoryAsset[];
}

export default function AssetInventory({ assets }: AssetInventoryProps) {
    if (!assets.length) {
        return (
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#e0e0d1] text-center">
                <p className="text-sm text-[#7c795d]">Aucun stock actif sur cette unité. Ajoutez un produit pour commencer à suivre vos volumes.</p>
                <Link href="/products/add" className="inline-flex items-center gap-2 bg-[#497a3a] text-white px-5 py-2.5 rounded-xl font-bold text-xs mt-4">
                    <FaPlus size={10} /> Ajouter un produit
                </Link>
            </section>
        );
    }

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
                
                <Link href="/products/add" className="flex items-center gap-2 bg-[#497a3a] hover:bg-[#3d6630] text-white px-4 py-2.5 rounded-xl transition-colors">
                    <span className="text-xs font-bold uppercase tracking-wider">Ajouter</span>
                    <FaPlus size={10} />
                </Link>
            </div>

            {/* GRILLE D'INVENTAIRE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assets.slice(0, 6).map((item) => (
                    <div key={item.id} className="p-6 bg-[#f8faf7] rounded-2xl border border-[#e0e0d1] hover:shadow-md transition-shadow duration-300">
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wider mb-1">{item.name}</p>
                                <h3 className="text-3xl font-black text-[#2d3436] tracking-tight">
                                    {item.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span className="text-sm font-bold text-[#7c795d]">{item.unit}</span>
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-[#497a3a] bg-[#e6f4ea] px-3 py-1.5 rounded-lg">
                                    {(item.quantity * item.marketPrice).toLocaleString('fr-FR')} F CFA
                                </p>
                            </div>
                        </div>

                        {/* INDICATEURS DE SANTÉ DU STOCK */}
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#e0e0d1]">
                            <div className="flex items-center gap-3">
                                <FaClock className="text-[#a4a291]" size={14} />
                                <div>
                                    <p className="text-[10px] font-bold text-[#a4a291] uppercase">Stocké depuis</p>
                                    <p className="text-xs font-bold text-[#5b4636]">{Math.round(item.ageInDays)} jours</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-[#a4a291] uppercase">Qualité</p>
                                <p className={`text-xs font-bold ${item.riskLevel === 'CRITIQUE' ? 'text-red-500' : item.riskLevel === 'ALERTE' ? 'text-amber-600' : 'text-[#497a3a]'}`}>
                                    {item.riskLevel === 'STABLE' ? 'Stable' : item.riskLevel}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {assets.length > 6 && (
                    <div className="text-sm text-[#7c795d] font-semibold">
                        +{assets.length - 6} lots supplémentaires suivis…
                    </div>
                )}
            </div>
        </section>
    );
}
