'use client';

import React from 'react';
import type { Category } from '@/types/product-flow';

interface StepCategoriesProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (catId: string, catName: string) => void;
}

export default function StepCategories({ categories, selectedCategory, onSelect }: StepCategoriesProps) {
  if (categories.length === 0) {
    return <div className="text-sm text-slate-500">Chargement des catégories...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
      {categories.map((cat) => (
        <button
          type="button"
          key={cat.id}
          onClick={() => onSelect(String(cat.id), cat.name)}
          className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center ${
            selectedCategory === String(cat.id)
              ? 'border-green-500 bg-white shadow-xl scale-105'
              : 'border-transparent bg-white/50'
          }`}
        >
          <div className="text-3xl mb-3 p-4 rounded-full bg-gray-100 text-gray-700" />
          <span className="font-black text-[10px] uppercase tracking-widest text-slate-500">
            {cat.name}
          </span>
        </button>
      ))}
    </div>
  );
}
