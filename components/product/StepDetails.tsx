'use client';

import React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormData, PriceInfo, SubCategory } from '@/types/product-flow';
import { UNIT_OPTIONS } from '@/types/product-flow';
import PriceIndicator from './PriceIndicator';

interface StepDetailsProps {
  form: UseFormReturn<ProductFormData>;
  defaultPriceInfo: PriceInfo | null;
  competitorCount: number;
  onNext: () => void;
}

export default function StepDetails({ form, defaultPriceInfo, competitorCount, onNext }: StepDetailsProps) {
  const { register, watch } = form;
  const watchedPrice = watch('price');
  const watchedQuantity = watch('quantity');
  const watchedUnit = watch('unit');
  const watchedName = watch('name');

  const canProceed = !!watchedPrice && !!watchedQuantity && !!watchedName;

  return (
    <div className="space-y-6 animate-in slide-in-from-right-10">
      {/* Name */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">
          Nom du produit
        </label>
        <input
          type="text"
          placeholder="Ex: Maïs blanc de Bama"
          className="w-full text-xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2"
          {...register('name', { required: true })}
        />
      </div>

      {/* Description */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">
          Description
        </label>
        <textarea
          placeholder="Décrivez votre produit (qualité, origine, etc.)"
          rows={3}
          className="w-full text-sm font-medium bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2 resize-none"
          {...register('description')}
        />
      </div>

      {/* Quantity + Unit */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">
          Quantité disponible
        </label>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="0"
            className="flex-1 text-3xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2"
            {...register('quantity', { required: true })}
          />
          <select
            className="bg-slate-100 font-black rounded-2xl px-4 text-xs outline-none"
            {...register('unit')}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Price (single input — bug fix: was registered twice before) */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-4 block">
          Prix unitaire (F/{watchedUnit})
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            placeholder="Ex: 500"
            className="w-full text-3xl font-black bg-transparent border-b-4 border-slate-100 focus:border-green-500 outline-none pb-2"
            {...register('price', { required: true })}
          />
          <span className="absolute right-0 bottom-3 font-black text-slate-300">F</span>
        </div>

        {defaultPriceInfo && (
          <PriceIndicator
            defaultPriceInfo={defaultPriceInfo}
            enteredPrice={parseFloat(String(watchedPrice || '0')) || 0}
            unit={watchedUnit}
            competitorCount={competitorCount}
          />
        )}
      </div>

      <button
        type="button"
        disabled={!canProceed}
        onClick={onNext}
        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest disabled:opacity-40"
      >
        Suivant
      </button>
    </div>
  );
}
