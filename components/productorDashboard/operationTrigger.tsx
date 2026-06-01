'use client';

import React from 'react';
import Link from 'next/link';
import { FaBolt, FaExclamationTriangle, FaArrowRight, FaPercentage, FaTruck, FaLeaf } from 'react-icons/fa';
import type { InventoryAsset } from '@/hooks/useInventory';

interface TriggerProps {
    assets: InventoryAsset[];
}

function pickTop<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
    return items.filter(predicate).sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0))[0];
}

export default function OperationalTriggers({ assets }: TriggerProps) {
    const criticalAsset = pickTop(assets, (item) => item.riskLevel === 'CRITIQUE' && item.isPerishable);
    const harvestReady = pickTop(assets, (item) => !!item.expectedHarvestDate && new Date(item.expectedHarvestDate) <= new Date());
    const largestLot = pickTop(assets, () => true);

    if (!assets.length) return null;

    return (
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e0d1]">
            
            {/* TITRE SECTION */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#e65100]/10 rounded-xl flex items-center justify-center text-[#e65100]">
                    <FaBolt size={18} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-[#5b4636]">Actions Requises</h2>
                    <p className="text-xs text-[#7c795d]">Décisions importantes</p>
                </div>
            </div>

            <div className="space-y-4">

                {/* DÉCISION 1 : URGENCE PÉRISSABLE */}
                {criticalAsset && (
                    <div className="group bg-red-50 p-5 rounded-2xl border border-red-100">
                        <div className="flex items-start gap-2 mb-3">
                            <FaExclamationTriangle className="text-red-600 mt-0.5" size={14} />
                            <div>
                                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Risque de perte</p>
                                <p className="text-sm font-bold text-[#5b4636] mt-1 leading-snug">
                                    {criticalAsset.quantity.toLocaleString('fr-FR')} {criticalAsset.unit.toLowerCase()} de {criticalAsset.name} dépassent la fenêtre de fraîcheur.
                                </p>
                            </div>
                        </div>
                        <Link href="/products" className="w-full inline-flex items-center justify-center gap-2 bg-white text-red-600 border border-red-200 py-3 rounded-xl hover:bg-red-50 transition-colors text-xs font-bold uppercase tracking-wide">
                            <FaPercentage />
                            Ajuster les prix
                        </Link>
                    </div>
                )}

                {/* DÉCISION 2 : RÉCOLTE IMMINENTE */}
                {harvestReady && (
                    <div className="group bg-[#497a3a] p-5 rounded-2xl text-white">
                        <div className="flex items-start gap-2 mb-3">
                            <FaLeaf className="text-green-200 mt-0.5" size={14} />
                            <div>
                                <p className="text-xs font-bold text-green-100 uppercase tracking-wide">Maturité Optimale</p>
                                <p className="text-sm font-bold text-white mt-1 leading-snug">
                                    {harvestReady.name} arrive à maturité ({new Date(harvestReady.expectedHarvestDate as string).toLocaleDateString('fr-FR')}).
                                </p>
                            </div>
                        </div>
                        <Link href="/production" className="w-full inline-flex items-center justify-center gap-2 bg-white text-[#497a3a] py-3 rounded-xl hover:bg-green-50 transition-colors text-xs font-bold uppercase tracking-wide">
                            Lancer la récolte
                            <FaArrowRight size={10} />
                        </Link>
                    </div>
                )}

                {/* DÉCISION 3 : LOGISTIQUE / B2B */}
                <div className="bg-[#f8faf7] p-5 rounded-2xl border border-[#e0e0d1]">
                    <div className="flex items-start gap-2 mb-3">
                        <FaTruck className="text-[#7c795d] mt-0.5" size={14} />
                        <div>
                            <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wide">Lot prioritaire</p>
                            {largestLot ? (
                                <p className="text-sm font-bold text-[#5b4636] mt-1 leading-snug">
                                    {largestLot.quantity.toLocaleString('fr-FR')} {largestLot.unit.toLowerCase()} de {largestLot.name} disponibles.
                                </p>
                            ) : (
                                <p className="text-sm font-medium text-[#5b4636] mt-1 leading-snug">
                                    Aucun lot prioritaire détecté.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 bg-white border border-[#e0e0d1] text-[#7c795d] py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-gray-50 transition-all">
                            Ignorer
                        </button>
                        <button className="flex-[2] bg-[#497a3a] text-white py-3 rounded-xl text-[10px] font-bold uppercase hover:bg-[#3d6630] transition-all shadow-sm">
                            Accepter
                        </button>
                    </div>
                </div>

            </div>

            {/* PETIT CONSEIL "AI" EN BAS */}
            <div className="mt-6 pt-4 border-t border-[#e0e0d1]">
                <p className="text-xs font-medium text-[#7c795d] leading-relaxed">
                    <span className="font-bold text-[#497a3a]">Conseil :</span> Vendre vos tomates maintenant libère <span className="font-bold">12%</span> d'espace pour la récolte de maïs.
                </p>
            </div>
        </section>
    );
}