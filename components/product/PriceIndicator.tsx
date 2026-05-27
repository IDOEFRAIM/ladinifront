'use client';

import React from 'react';
import type { PriceInfo } from '@/types/product-flow';

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

  // Si pas de prix de référence, on n'affiche rien
  if (avg <= 0) return null;

  const ratio = enteredPrice / avg;
  
  // Statuts de tolérance
  const status = ratio >= 0.9 && ratio <= 1.1 ? 'in-range' : ratio >= 0.75 && ratio <= 1.25 ? 'warn' : 'out';

  /**
   * CALCUL DE LA POSITION DU CURSEUR (De 0% à 100%)
   * On veut que si enteredPrice === avg, le curseur soit pile au milieu (50%).
   * On définit une plage allant de 0.5 * avg (gauche) à 1.5 * avg (droite).
   */
  const minPrice = avg * 0.5;
  const maxPrice = avg * 1.5;
  const barPos = Math.min(100, Math.max(0, ((enteredPrice - minPrice) / (maxPrice - minPrice)) * 100));

  return (
    <div className="mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="text-xs text-slate-500 font-medium">
        Prix conseillé (zone) : <strong className="text-slate-800">{avg.toLocaleString()} F/{refUnit}</strong>
      </div>

      {/* Conteneur de la barre (SANS overflow-hidden pour laisser respirer le curseur) */}
      <div className="w-full h-3 mt-4 relative flex items-center">
        {/* La jauge avec le dégradé : Rouge (Trop bas) -> Vert (Idéal au milieu) -> Rouge (Trop cher) */}
        <div
          className="absolute inset-0 h-3 rounded-full"
          style={{ background: 'linear-gradient(90deg, #ef4444 0%, #16a34a 50%, #ef4444 100%)' }}
        />
        
        {/* Le Curseur (Maintenant une vraie ligne verticale bien visible) */}
        {enteredPrice > 0 && (
          <div
            className="absolute z-10 flex flex-col items-center"
            style={{ left: `${barPos}%`, transform: 'translateX(-50%)' }}
          >
            {/* Barre verticale noire qui traverse la jauge */}
            <div className="w-1 h-5 bg-slate-900 rounded-full shadow-md" />
            {/* Petit indicateur textuel du prix actuel au-dessus ou en-dessous si nécessaire */}
          </div>
        )}
      </div>

      {/* Messages d'alerte contextuels */}
      {enteredPrice > 0 && (
        <div className="mt-3 space-y-1">
          {status === 'out' && (
            <p className="text-xs font-semibold text-red-600 animate-pulse">
              ⚠️ Votre prix s'écarte fortement de la référence locale ({Math.round(ratio * 100)}%).
            </p>
          )}
          {competitorCount > 10 && enteredPrice > avg && (
            <p className="text-xs font-semibold text-orange-600">
              💡 Il y a déjà beaucoup de concurrents ({competitorCount}) sur cette zone. Baissez votre prix pour vendre plus vite.
            </p>
          )}
          {status === 'in-range' && (
            <p className="text-xs font-semibold text-green-600">
              ✨ Excellent prix ! Vous êtes pile dans la moyenne de votre zone.
            </p>
          )}
        </div>
      )}
    </div>
  );
}