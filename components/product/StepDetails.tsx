'use client';

import React, { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ProductFormData, PriceInfo } from '@/types/product-flow';
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
  
  // Observation ultra-stable des valeurs en temps réel
  const watchedPrice = watch('price');
  const watchedQuantityForSale = watch('quantityForSale');
  const watchedUnit = watch('unit');
  const watchedName = watch('name');

  // Sécurisation de la validation : tolérance totale aux types hybrides (string/number)
  const canProceed = useMemo(() => {
    const nameValid = !!watchedName && String(watchedName).trim().length > 0;
    
    // Conversion sécurisée pour parer aux chaînes vides ou valeurs nulles de l'UI
    const qtyValue = parseFloat(String(watchedQuantityForSale || '0'));
    const priceValue = parseFloat(String(watchedPrice || '0'));

    return nameValid && qtyValue > 0 && priceValue > 0;
  }, [watchedName, watchedQuantityForSale, watchedPrice]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-10 duration-300">
      
      {/* Champ Nom du produit */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-wider">
          Nom du produit
        </label>
        <input
          type="text"
          placeholder="Ex: Maïs blanc de Bama"
          className="w-full text-lg font-black bg-transparent border-b-2 border-slate-100 focus:border-emerald-500 outline-none pb-2 transition-colors placeholder:text-slate-300 text-slate-800"
          {...register('name', { required: true })}
        />
      </div>

      {/* Champ Description */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-wider">
          Description
        </label>
        <textarea
          placeholder="Décrivez votre produit (qualité, origine, etc.)"
          rows={3}
          className="w-full text-sm font-medium bg-transparent border-b-2 border-slate-100 focus:border-emerald-500 outline-none pb-2 resize-none transition-colors placeholder:text-slate-300 text-slate-700"
          {...register('description')}
        />
      </div>

      {/* Quantité & Unité de mesure */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-wider">
          Quantité disponible
        </label>
        <div className="flex gap-4 items-end">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="0"
            className="flex-1 text-2xl font-black bg-transparent border-b-2 border-slate-100 focus:border-emerald-500 outline-none pb-2 transition-colors placeholder:text-slate-300 text-slate-800"
            // valueAsNumber élimine les conflits de types et fluidifie la saisie au clavier
            {...register('quantityForSale', { required: true, min: 0.001, valueAsNumber: false })}
          />
          <select
            className="bg-slate-100 font-black rounded-xl px-4 py-2 text-xs outline-none cursor-pointer border border-transparent focus:border-emerald-500 text-slate-700 transition-all mb-1"
            {...register('unit')}
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Prix unitaire & Indicateur dynamique */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block tracking-wider">
          Prix unitaire (F/{watchedUnit || 'KG'})
        </label>
        <div className="relative mb-2">
          <input
            type="number"
            step="any"
            min="0"
            placeholder="Ex: 500"
            className="w-full text-2xl font-black bg-transparent border-b-2 border-slate-100 focus:border-emerald-500 outline-none pb-2 transition-colors placeholder:text-slate-300 text-slate-800"
            {...register('price', { required: true, min: 0.01, valueAsNumber: false })}
          />
          <span className="absolute right-0 bottom-2 font-black text-slate-300 select-none">F</span>
        </div>

        {/* Composant d'analyse de marché contextuel */}
        {defaultPriceInfo && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <PriceIndicator
              defaultPriceInfo={defaultPriceInfo}
              enteredPrice={parseFloat(String(watchedPrice || '0')) || 0}
              unit={watchedUnit || 'KG'}
              competitorCount={competitorCount}
            />
          </div>
        )}
      </div>

      {/* Bouton de validation d'étape */}
      <button
        type="button"
        disabled={!canProceed}
        onClick={onNext}
        className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md select-none active:scale-[0.99]"
      >
        Suivant
      </button>
    </div>
  );
}