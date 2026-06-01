'use client';

import React from 'react';
import { FaArrowUp, FaArrowDown, FaBalanceScale } from 'react-icons/fa';
import type { InventoryAsset } from '@/hooks/useInventory';

interface ArbitrageProps {
    assets: InventoryAsset[];
}

export default function MarketArbitrage({ assets }: ArbitrageProps) {
    if (!assets.length) {
        return (
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-[#e0e0d1] text-center">
                <p className="text-sm text-[#7c795d]">Aucune donnée marché disponible : ajoutez des produits pour activer les comparatifs de prix.</p>
            </section>
        );
    }

    const summary = computeSummary(assets);
    const { diffPct, trendLabel, bestAsset } = summary;

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

            <div className="space-y-4">
                <div className="p-6 bg-[#f7f5ee] rounded-2xl border border-[#e0e0d1]">
                    <p className="text-xs font-bold text-[#7c795d] uppercase tracking-wider mb-2">Tendance globale du portefeuille</p>
                    <div className="flex items-center gap-3">
                        <span className={`text-3xl font-black ${diffPct >= 0 ? 'text-[#497a3a]' : 'text-red-500'}`}>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                        </span>
                        {diffPct >= 0 ? <FaArrowUp className="text-[#497a3a]" size={20} /> : <FaArrowDown className="text-red-500" size={20} />}
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#5b4636]">
                        {trendLabel}
                    </p>
                </div>

                {bestAsset && (
                    <div className="p-5 bg-white rounded-2xl border border-[#e0e0d1] shadow-sm">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs text-[#7c795d]">Produit le plus rentable</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${bestAsset.margin >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {bestAsset.margin >= 0 ? '▲ Marge positive' : '▼ Sous le coût'}
                            </span>
                        </div>
                        <p className="text-3xl font-black text-[#5b4636]">
                            {bestAsset.asset.marketPrice.toLocaleString('fr-FR')} <span className="text-sm font-normal text-[#7c795d]">F/kg</span>
                        </p>
                        <div className="mt-4 pt-4 border-t border-dashed border-[#e0e0d1] flex justify-between items-center text-xs">
                            <span className="text-[#7c795d]">Seuil rentabilité:</span>
                            <span className="font-bold text-[#5b4636]">{bestAsset.asset.purchasePrice.toLocaleString('fr-FR')} F/kg</span>
                        </div>
                        <p className="text-xs text-[#7c795d] mt-3">{bestAsset.asset.name} ({bestAsset.asset.unitId})</p>
                    </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-[#e65100]/10 rounded-xl border border-[#e65100]/20">
                    <div className="mt-0.5 text-[#e65100]">
                        {diffPct >= 0 ? <FaArrowUp size={14} /> : <FaArrowDown size={14} />}
                    </div>
                    <p className="text-xs font-medium text-[#e65100] leading-snug">
                        {bestAsset ? `Protégez votre marge sur ${bestAsset.asset.name}: ${(bestAsset.margin).toLocaleString('fr-FR')} F/kg d'écart.` : 'Aucune alerte de marge pour le moment.'}
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
