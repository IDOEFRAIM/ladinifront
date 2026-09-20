'use client';

import React from 'react';
import Link from 'next/link';
import { FaBolt, FaExclamationTriangle, FaArrowRight, FaPercentage, FaTruck, FaLeaf } from 'react-icons/fa';
import type { InventoryAsset } from '@/features/inventory/hooks/useInventory';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

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
    const atRiskCount = assets.filter((item) => item.riskLevel !== 'STABLE').length;

    if (!assets.length) return null;

    return (
        <section className="p-6 rounded-3xl shadow-sm" style={{ background: C.white, border: `1px solid ${C.border}` }}>

            {/* TITRE SECTION */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.1)', color: C.amber }}>
                    <FaBolt size={18} />
                </div>
                <div>
                    <h2 style={{ fontFamily: F.heading, color: C.forest }} className="text-lg font-bold">Actions Requises</h2>
                    <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs">Décisions importantes</p>
                </div>
            </div>

            <div className="space-y-4">

                {/* DÉCISION 1 : URGENCE PÉRISSABLE */}
                {criticalAsset && (
                    <div className="group p-5 rounded-2xl" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                        <div className="flex items-start gap-2 mb-3">
                            <FaExclamationTriangle style={{ color: C.statRose }} className="mt-0.5" size={14} />
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: F.body, color: C.statRose }} className="text-xs font-bold uppercase tracking-wide">Risque de perte</p>
                                <p style={{ fontFamily: F.body, color: C.text }} className="text-sm font-bold mt-1 leading-snug">
                                    {criticalAsset.quantity.toLocaleString('fr-FR')} {criticalAsset.unit.toLowerCase()} de {criticalAsset.name} dépassent la fenêtre de fraîcheur.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/products"
                            style={{ fontFamily: F.body, color: C.statRose, border: '1px solid rgba(244,63,94,0.25)' }}
                            className="w-full inline-flex items-center justify-center gap-2 bg-white py-3 rounded-xl hover:bg-rose-50 transition-colors text-xs font-bold uppercase tracking-wide"
                        >
                            <FaPercentage />
                            Ajuster les prix
                        </Link>
                    </div>
                )}

                {/* DÉCISION 2 : RÉCOLTE IMMINENTE */}
                {harvestReady && (
                    <div className="group p-5 rounded-2xl text-white" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}>
                        <div className="flex items-start gap-2 mb-3">
                            <FaLeaf className="mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }} size={14} />
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontFamily: F.body, color: 'rgba(255,255,255,0.8)' }} className="text-xs font-bold uppercase tracking-wide">Maturité Optimale</p>
                                <p style={{ fontFamily: F.body }} className="text-sm font-bold text-white mt-1 leading-snug">
                                    {harvestReady.name} arrive à maturité ({new Date(harvestReady.expectedHarvestDate as string).toLocaleDateString('fr-FR')}).
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/production"
                            style={{ fontFamily: F.body, color: C.forest }}
                            className="w-full inline-flex items-center justify-center gap-2 bg-white py-3 rounded-xl hover:bg-emerald-50 transition-colors text-xs font-bold uppercase tracking-wide"
                        >
                            Lancer la récolte
                            <FaArrowRight size={10} />
                        </Link>
                    </div>
                )}

                {/* DÉCISION 3 : LOGISTIQUE / B2B */}
                <div className="p-5 rounded-2xl" style={{ background: C.sand, border: `1px solid ${C.border}` }}>
                    <div className="flex items-start gap-2 mb-3">
                        <FaTruck style={{ color: C.muted }} className="mt-0.5" size={14} />
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs font-bold uppercase tracking-wide">Lot prioritaire</p>
                            {largestLot ? (
                                <p style={{ fontFamily: F.body, color: C.text }} className="text-sm font-bold mt-1 leading-snug">
                                    {largestLot.quantity.toLocaleString('fr-FR')} {largestLot.unit.toLowerCase()} de {largestLot.name} disponibles.
                                </p>
                            ) : (
                                <p style={{ fontFamily: F.body, color: C.text }} className="text-sm font-medium mt-1 leading-snug">
                                    Aucun lot prioritaire détecté.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            style={{ fontFamily: F.body, color: C.muted, border: `1px solid ${C.border}` }}
                            className="flex-1 bg-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-gray-50 transition-all"
                        >
                            Ignorer
                        </button>
                        <button
                            style={{ fontFamily: F.body, background: C.forest }}
                            className="flex-[2] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-sm"
                        >
                            Accepter
                        </button>
                    </div>
                </div>

            </div>

            {/* PETIT CONSEIL EN BAS — dérivé des vraies données du stock, jamais un produit/chiffre fixe */}
            <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs font-medium leading-relaxed">
                    <span style={{ color: C.emerald }} className="font-bold">Conseil :</span>{' '}
                    {atRiskCount > 0
                        ? `${atRiskCount} lot${atRiskCount > 1 ? 's' : ''} sur ${assets.length} nécessite${atRiskCount > 1 ? 'nt' : ''} une attention particulière en ce moment.`
                        : `Tous vos lots sont stables pour le moment — aucune action urgente sur les ${assets.length} suivi${assets.length > 1 ? 's' : ''}.`}
                </p>
            </div>
        </section>
    );
}