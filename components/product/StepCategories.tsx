'use client';

import React from 'react';
import type { Category } from '@/types/product-flow';

interface StepCategoriesProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (catId: string, catName: string) => void;
}

export default function StepCategories({ categories, selectedCategory, onSelect }: StepCategoriesProps) {
  // Squelette visuel de chargement épuré
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-sm font-medium text-slate-400 italic">
        Chargement des catégories...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
      {categories.map((cat) => {
        const isSelected = selectedCategory === String(cat.id);

        return (
          <button
            type="button"
            key={cat.id}
            onClick={() => onSelect(String(cat.id), cat.name)}
            aria-selected={isSelected}
            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center cursor-pointer select-none active:scale-[0.98] ${
              isSelected
                ? 'border-emerald-500 bg-white shadow-lg shadow-emerald-600/5 scale-[1.02]'
                : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
            }`}
          >
            {/* Conteneur d'icône dynamique (Émoji ou icône texte) */}
            <div className={`text-2xl mb-3 p-3 rounded-xl flex items-center justify-center transition-colors ${
              isSelected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'
            }`}>
              {/* @ts-ignore : s'adapte si votre modèle possède une propriété icon/emoji */}
              {cat.icon || cat.emoji || '📦'}
            </div>

            {/* Label de la catégorie */}
            <span className={`font-black text-xs uppercase tracking-wider transition-colors ${
              isSelected ? 'text-emerald-900' : 'text-slate-700'
            }`}>
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}