'use client';

import React from 'react';
import { FaArrowUp, FaArrowDown, FaBalanceScale } from 'react-icons/fa';
import type { InventoryAsset } from '@/features/inventory/hooks/useInventory';
import { THEME_COLORS as C, THEME_FONTS as F } from '@/lib/theme';

// L'unité de prix doit refléter la vraie unité de l'actif (KG, UNITÉ, TONNE, SAC, LITRE...) —
// jamais un "F/kg" codé en dur : un producteur qui vend des bœufs à l'unité ne doit
// jamais voir un prix affiché "au kg", ça n'a pas de sens et induit en erreur.
function priceUnitLabel(unit: string): string {
    const map: Record<string, string> = {
        KG: 'kg',
        TONNE: 'tonne',
        LITRE: 'litre',
        UNITÉ: 'unité',
        SAC_100: 'sac',
        SAC_50: 'sac',
    };
    return map[unit] || unit.toLowerCase();
}

interface ArbitrageProps {
    assets: InventoryAsset[];
}

export default function MarketArbitrage({ assets }: ArbitrageProps) {
    if (!assets.length) {
        return (
            <section className="p-6 rounded-3xl shadow-sm text-center" style={{ background: C.white, border: `1px solid ${C.border}` }}>
                <p style={{ fontFamily: F.body, color: C.muted }} className="text-sm">Aucune donnée marché disponible : ajoutez des produits pour activer les comparatifs de prix.</p>
            </section>
        );
    }

    const summary = computeSummary(assets);
    const { diffPct, trendLabel, bestAsset } = summary;
    const trendColor = diffPct >= 0 ? C.emerald : C.statRose;

    return (
        <section className="p-6 rounded-3xl shadow-sm" style={{ background: C.white, border: `1px solid ${C.border}` }}>

            {/* EN-TÊTE */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', color: C.emerald }}>
                        <FaBalanceScale size={18} />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: F.heading, color: C.forest }} className="text-lg font-bold">Prix du Marché</h2>
                        <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs">Comparaison en temps réel</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-6 rounded-2xl" style={{ background: C.sand, border: `1px solid ${C.border}` }}>
                    <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs font-bold uppercase tracking-wide mb-2">Tendance du portefeuille</p>
                    <div className="flex items-center gap-3">
                        <span style={{ fontFamily: F.heading, color: trendColor }} className="text-3xl font-black">
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                        </span>
                        {diffPct >= 0 ? <FaArrowUp style={{ color: trendColor }} size={20} /> : <FaArrowDown style={{ color: trendColor }} size={20} />}
                    </div>
                    <p style={{ fontFamily: F.body, color: C.text }} className="mt-3 text-sm font-medium">
                        {trendLabel}
                    </p>
                </div>

                {bestAsset && (
                    <div className="p-5 rounded-2xl shadow-sm" style={{ background: C.white, border: `1px solid ${C.border}` }}>
                        <div className="flex justify-between items-end gap-2 mb-2">
                            <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs">Produit le plus rentable</p>
                            <span
                                style={{
                                    fontFamily: F.body,
                                    background: bestAsset.margin >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                                    color: bestAsset.margin >= 0 ? C.emerald : C.statRose,
                                    whiteSpace: 'nowrap',
                                }}
                                className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                            >
                                {bestAsset.margin >= 0 ? '▲ Marge positive' : '▼ Sous le coût'}
                            </span>
                        </div>
                        <p style={{ fontFamily: F.heading, color: C.forest, whiteSpace: 'nowrap' }} className="text-3xl font-black">
                            {bestAsset.asset.marketPrice.toLocaleString('fr-FR')} <span style={{ fontFamily: F.body, color: C.muted }} className="text-sm font-normal">F/{priceUnitLabel(bestAsset.asset.unit)}</span>
                        </p>
                        <div className="mt-4 pt-4 text-xs" style={{ borderTop: `1px dashed ${C.border}` }}>
                            <span style={{ fontFamily: F.body, color: C.muted }}>Seuil de rentabilité</span>
                            <p style={{ fontFamily: F.heading, color: C.forest, whiteSpace: 'nowrap' }} className="font-bold text-sm mt-0.5">{bestAsset.asset.purchasePrice.toLocaleString('fr-FR')} F/{priceUnitLabel(bestAsset.asset.unit)}</p>
                        </div>
                        <p style={{ fontFamily: F.body, color: C.muted }} className="text-xs mt-3">{bestAsset.asset.name} ({bestAsset.asset.unitId})</p>
                    </div>
                )}

                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
                    <div className="mt-0.5" style={{ color: C.amber }}>
                        {diffPct >= 0 ? <FaArrowUp size={14} /> : <FaArrowDown size={14} />}
                    </div>
                    <p style={{ fontFamily: F.body, color: C.amber }} className="text-xs font-medium leading-snug">
                        {bestAsset ? `Protégez votre marge sur ${bestAsset.asset.name}: ${(bestAsset.margin).toLocaleString('fr-FR')} F/${priceUnitLabel(bestAsset.asset.unit)} d'écart.` : 'Aucune alerte de marge pour le moment.'}
                    </p>
                </div>
            </div>
        </section>
    );
}

type TrendSummary = {
    diffPct: number;
    trendLabel: string;
    bestAsset: { asset: InventoryAsset; margin: number } | null;
};

function computeSummary(assets: InventoryAsset[]): TrendSummary {
    const avgMarket = assets.reduce((acc, item) => acc + item.marketPrice, 0) / assets.length;
    const avgPurchase = assets.reduce((acc, item) => acc + item.purchasePrice, 0) / assets.length;
    const diffPct = avgPurchase === 0 ? 0 : ((avgMarket - avgPurchase) / avgPurchase) * 100;
    const trendLabel = diffPct >= 0
        ? 'Le marché reste favorable : profitez-en pour liquider les stocks mûrs.'
        : "Les prix descendent : sécurisez vos marges et différer les ventes sensibles.";

    let bestAsset: { asset: InventoryAsset; margin: number } | null = null;
    assets.forEach((asset) => {
        const margin = asset.marketPrice - asset.purchasePrice;
        if (!bestAsset || margin > bestAsset.margin) {
            bestAsset = { asset, margin };
        }
    });

    return { diffPct, trendLabel, bestAsset };
}
