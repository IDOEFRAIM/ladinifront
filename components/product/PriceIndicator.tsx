'use client';

import React from 'react';
import type { PriceInfo, SubCategory } from '@/types/product-flow';

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

  if (avg <= 0) return null;

  const ratio = enteredPrice / avg;
  const status = ratio >= 0.9 && ratio <= 1.1 ? 'in-range' : ratio >= 0.75 && ratio <= 1.25 ? 'warn' : 'out';
  const barPos = Math.min(100, Math.max(0, (enteredPrice / Math.max(avg * 1.5, 1)) * 100));

  return (
    <div className="mt-3">
      <div className="text-xs text-slate-500">
        Prix conseillé (zone) : <strong>{avg.toLocaleString()} F/{refUnit}</strong>
      </div>

      <div className="w-full h-3 rounded-full bg-slate-100 mt-2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg,#16a34a 0%,#f97316 50%,#ef4444 100%)' }}
        />
        <div
          className="absolute top-[-6px]"
          style={{ left: `${barPos}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-0.5 h-[14px] bg-slate-900" />
        </div>
      </div>

      {enteredPrice > 0 && status === 'out' && (
        <div className="mt-2 text-sm font-black text-red-600">
          Votre prix s'écarte fortement de la référence locale.
        </div>
      )}
      {enteredPrice > 0 && competitorCount > 10 && enteredPrice > avg && (
        <div className="mt-2 text-sm font-black text-orange-600">
          Il y a déjà beaucoup de vendeurs, baissez votre prix pour vendre plus vite.
        </div>
      )}
    </div>
  );
}
