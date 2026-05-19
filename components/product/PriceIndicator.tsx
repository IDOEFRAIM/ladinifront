'use client';

import React, { useMemo } from 'react';
import type { PriceInfo } from '@/types/product-flow';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

interface PriceIndicatorProps {
  defaultPriceInfo: PriceInfo;
  enteredPrice: number;
  unit: string;
  competitorCount?: number;
}

export default function PriceIndicator({
  defaultPriceInfo,
  enteredPrice,
  unit,
  competitorCount = 0,
}: PriceIndicatorProps) {
  const avg = Number(defaultPriceInfo.price || 0);
  const refUnit = defaultPriceInfo.unit || unit || 'KG';

  // Sécurité si aucune référence de prix locale n'est disponible
  if (avg <= 0) return null;

  // 1. Calcul du statut du prix mémorisé (Ratios : Vert ±10%, Orange ±25%, reste Rouge)
  const { ratio, statusColor, message } = useMemo(() => {
    if (enteredPrice <= 0) return { ratio: 0, statusColor: 'bg-slate-400', message: null };
    
    const currentRatio = enteredPrice / avg;
    
    // Zone Verte : Écart de ±10% max
    if (currentRatio >= 0.9 && currentRatio <= 1.1) {
      return {
        ratio: currentRatio,
        statusColor: 'bg-green-500',
        message: { type: 'success', text: 'Excellent prix ! Vous êtes pile dans la moyenne du marché.' }
      };
    }
    
    // Zone Orange : Écart entre 10% et 25%
    if (currentRatio >= 0.75 && currentRatio <= 1.25) {
      return {
        ratio: currentRatio,
        statusColor: 'bg-orange-500',
        message: { type: 'warning', text: 'Prix alternatif. Légèrement en dehors de la tendance locale.' }
      };
    }
    
    // Zone Rouge : Écart critique (> 25%)
    return {
      ratio: currentRatio,
      statusColor: 'bg-red-500',
      message: { type: 'danger', text: "Votre prix s'écarte fortement de la référence locale." }
    };
  }, [enteredPrice, avg]);

  // 2. Alignement mathématique strict du curseur sur la jauge (Échelle linéaire de 0.5x à 1.5x)
  const barPos = useMemo(() => {
    if (enteredPrice <= 0) return 50;
    const minRange = avg * 0.5;
    const maxRange = avg * 1.5;
    const percentage = ((enteredPrice - minRange) / (maxRange - minRange)) * 100;
    return Math.min(100, Math.max(0, percentage));
  }, [enteredPrice, avg]);

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      {/* En-tête informatif */}
      <div className="flex justify-between items-center text-xs text-slate-500 mb-3">
        <span className="font-medium">Moyenne locale (Zone)</span>
        <span className="font-black text-slate-800 bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-100/80">
          {avg.toLocaleString()} F / {refUnit}
        </span>
      </div>

      {/* Conteneur de la Jauge de positionnement */}
      <div className="relative my-5 mx-1 select-none">
        {/* Rail de fond segmenté : Largeurs calculées pour correspondre exactement aux ratios (0.5x à 1.5x) */}
        <div className="w-full h-2.5 rounded-full bg-slate-200 flex overflow-hidden shadow-inner">
          <div className="w-[25%] h-full bg-red-500/20" />    {/* 0.50x à 0.75x (Trop bas) */}
          <div className="w-[15%] h-full bg-orange-500/20" /> {/* 0.75x à 0.90x (Acceptable bas) */}
          <div className="w-[20%] h-full bg-green-500/25" />  {/* 0.90x à 1.10x (Zone cible idéale) */}
          <div className="w-[15%] h-full bg-orange-500/20" /> {/* 1.10x à 1.25x (Acceptable haut) */}
          <div className="w-[25%] h-full bg-red-500/20" />    {/* 1.25x à 1.50x (Trop cher) */}
        </div>

        {/* Curseur de prix dynamique */}
        {enteredPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 ease-out will-change-[left]"
            style={{ left: `${barPos}%` }}
          >
            <div className="relative -translate-x-1/2 flex flex-col items-center">
              {/* Point central pulse */}
              <div className={`w-4 h-4 rounded-full ${statusColor} border-2 border-white shadow-md transition-colors duration-300`} />
              {/* Ligne d'ancrage sur le rail */}
              <div className="w-0.5 h-3.5 bg-slate-800 -mt-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Blocs de messages contextuels et conseils */}
      <div className="space-y-2 mt-4">
        {message && (
          <div className={`flex items-start gap-2.5 text-xs font-bold p-3 rounded-xl border transition-all duration-300 ${
            message.type === 'success' ? 'bg-green-50/80 text-green-700 border-green-100' :
            message.type === 'warning' ? 'bg-orange-50/80 text-orange-700 border-orange-100' : 
            'bg-red-50/80 text-red-600 border-red-100'
          }`}>
            {message.type === 'success' && <FaCheckCircle className="mt-0.5 flex-shrink-0 text-green-600" size={14} />}
            {message.type === 'warning' && <FaInfoCircle className="mt-0.5 flex-shrink-0 text-orange-500" size={14} />}
            {message.type === 'danger' && <FaExclamationTriangle className="mt-0.5 flex-shrink-0 text-red-500" size={14} />}
            <span className="leading-relaxed">{message.text}</span>
          </div>
        )}

        {/* Alerte concurrence active */}
        {enteredPrice > avg && competitorCount > 10 && (
          <div className="flex items-start gap-2.5 text-xs font-bold p-3 bg-amber-50/80 text-amber-800 rounded-xl border border-amber-100 leading-relaxed">
            <FaInfoCircle className="mt-0.5 flex-shrink-0 text-amber-600" size={14} />
            <span>
              Marché saturé : Il y a déjà <strong>{competitorCount} vendeurs</strong> actifs. Réduire votre prix vous aidera à écouler vos stocks plus rapidement.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}