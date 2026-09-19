'use client';

import React from 'react';
import Link from 'next/link';
import { FaWarehouse, FaPlus, FaClock } from 'react-icons/fa';
import type { InventoryAsset } from '@/hooks/useInventory';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

interface AssetInventoryProps {
    assets: InventoryAsset[];
}

export default function AssetInventory({ assets }: AssetInventoryProps) {
    if (!assets.length) {
        return (
            <section className="p-8 rounded-3xl shadow-sm text-center" style={{ background: C.white, border: `1px solid ${C.border}` }}>
                <p style={{ fontFamily: F.body, color: C.muted }} className="text-sm">Aucun stock actif sur cette unité. Ajoutez un produit pour commencer à suivre vos volumes.</p>
                <Link href="/products/add" style={{ fontFamily: F.body, background: C.forest }} className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl font-bold text-xs mt-4">
                    <FaPlus size={10} /> Ajouter un produit
                </Link>
            </section>
        );
    }

    return (
        <section className="p-6 md:p-8 rounded-3xl shadow-sm" style={{ background: C.white, border: `1px solid ${C.border}` }}>

            {/* EN-TÊTE DE SECTION */}
            <div className="flex flex-wrap gap-4 justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', color: C.emerald }}>
                        <FaWarehouse size={20} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: F.heading, color: C.forest }} className="text-xl font-bold">Mon Stock</h2>
                        <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs">Produits actuellement stockés</p>
                    </div>
                </div>

                <Link
                    href="/products/add"
                    style={{ fontFamily: F.body, background: C.forest }}
                    className="flex items-center gap-2 hover:brightness-110 text-white px-4 py-2.5 rounded-xl transition-all"
                >
                    <span className="text-xs font-bold uppercase tracking-wider">Ajouter</span>
                    <FaPlus size={10} />
                </Link>
            </div>

            {/* GRILLE D'INVENTAIRE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assets.slice(0, 6).map((item) => (
                    <div
                        key={item.id}
                        className="p-6 rounded-2xl hover:shadow-md transition-shadow duration-300"
                        style={{ background: C.sand, border: `1px solid ${C.border}`, minWidth: 0 }}
                    >
                        <div className="flex justify-between items-start gap-3 mb-6">
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs font-bold uppercase tracking-wider mb-1">{item.name}</p>
                                <h3 style={{ fontFamily: F.heading, color: C.text, whiteSpace: 'nowrap' }} className="text-2xl md:text-3xl font-black tracking-tight">
                                    {item.quantity.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} <span style={{ fontFamily: F.body, color: C.muted }} className="text-sm font-bold">{item.unit}</span>
                                </h3>
                            </div>
                            <div className="text-right shrink-0">
                                <p style={{ fontFamily: F.body, color: C.emerald, background: 'rgba(16,185,129,0.1)', whiteSpace: 'nowrap' }} className="text-xs font-bold px-3 py-1.5 rounded-lg">
                                    {(item.quantity * item.marketPrice).toLocaleString('fr-FR')} F CFA
                                </p>
                            </div>
                        </div>

                        {/* INDICATEURS DE SANTÉ DU STOCK */}
                        <div className="grid grid-cols-2 gap-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                            <div className="flex items-center gap-3">
                                <FaClock style={{ color: C.muted }} size={14} />
                                <div>
                                    <p style={{ fontFamily: F.body, color: C.muted }} className="text-[10px] font-bold uppercase">Stocké depuis</p>
                                    <p style={{ fontFamily: F.body, color: C.text }} className="text-xs font-bold">{Math.round(item.ageInDays)} jours</p>
                                </div>
                            </div>
                            <div>
                                <p style={{ fontFamily: F.body, color: C.muted }} className="text-[10px] font-bold uppercase">Qualité</p>
                                <p
                                    style={{
                                        fontFamily: F.body,
                                        color: item.riskLevel === 'CRITIQUE' ? C.danger : item.riskLevel === 'ALERTE' ? C.amber : C.emerald,
                                    }}
                                    className="text-xs font-bold"
                                >
                                    {item.riskLevel === 'STABLE' ? 'Stable' : item.riskLevel}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
                {assets.length > 6 && (
                    <div style={{ fontFamily: F.body, color: C.muted }} className="text-sm font-semibold">
                        +{assets.length - 6} lots supplémentaires suivis…
                    </div>
                )}
            </div>
        </section>
    );
}
