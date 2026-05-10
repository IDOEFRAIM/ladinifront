'use client';

import React from 'react';
import { STEPS, TOTAL_STEPS } from '@/types/product-flow';

interface ProductStepperProps {
  currentStep: number;
}

export default function ProductStepper({ currentStep }: ProductStepperProps) {
  return (
    <>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-green-600 h-full transition-all duration-500"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[10px]">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex-1 text-center py-1 rounded-md ${
              currentStep === s.id
                ? 'bg-green-600 text-white font-black'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </>
  );
}
