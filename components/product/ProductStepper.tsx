'use client';

import React, { useMemo } from 'react';
import { STEPS, TOTAL_STEPS } from '@/types/product-flow';

interface ProductStepperProps {
  currentStep: number;
}

export default function ProductStepper({ currentStep }: ProductStepperProps) {
  // Calcul mémorisé du pourcentage de progression
  const progressPercentage = useMemo(() => {
    return Math.min(Math.max((currentStep / TOTAL_STEPS) * 100, 0), 100);
  }, [currentStep]);

  return (
    <div className="w-full">
      {/* Barre de progression structurelle (Accessible) */}
      <div 
        className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
      >
        <div
          className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Libellés des étapes adaptés aux petits écrans */}
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] tracking-wide uppercase select-none">
        {STEPS.map((s) => {
          const isActive = currentStep === s.id;
          const isPassed = currentStep > s.id;

          return (
            <div
              key={s.id}
              className={`flex-1 text-center py-1.5 px-1 rounded-lg font-black transition-all duration-300 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                  : isPassed
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-50 text-slate-400 border border-slate-100/50'
              }`}
            >
              {s.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}