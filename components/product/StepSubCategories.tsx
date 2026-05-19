'use client';

import React from 'react';
import type { SubCategory, StandardPriceMap } from '@/types/product-flow';

interface StepSubCategoriesProps {
  subCategories: SubCategory[];
  standardPriceMap: StandardPriceMap;
  parentCategoryName: string;
  zoneId: string | null;
  onSelect: (subId: string, label: string) => void;
  onBack: () => void;
}

export default function StepSubCategories({
  subCategories,
  standardPriceMap,
  parentCategoryName,
  zoneId,
  onSelect,
  onBack,
}: StepSubCategoriesProps) {

  // Résolution du prix optimisée
  const resolvePrice = (sub: SubCategory) => {
    const key = String(sub.id);
    const mapped = standardPriceMap[key];
    if (mapped) return { price: mapped.price, unit: mapped.unit };

    const spArr = sub.standardPrices ?? [];
    const zoneMatch = spArr.find((sp) => String(sp.zone?.id) === String(zoneId));
    if (zoneMatch) return { price: Number(zoneMatch.pricePerUnit), unit: zoneMatch.unit };
    if (spArr.length > 0) return { price: Number(spArr[0].pricePerUnit), unit: spArr[0].unit };
    return null;
  };

  return (
    <div className="w-full">
      {/* Barre de titre et retour */}
      <div className="mb-6 flex items-center gap-4">
        <button 
          type="button" 
          onClick={onBack} 
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
        >
          ← Retour
        </button>
        <h3 className="font-black text-xl text-slate-800">Choisissez une sous-catégorie</h3>
      </div>

      {/* Grille des sous-catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subCategories.map((sub) => {
          const count = sub._count?.products ?? 0;
          const priceData = resolvePrice(sub);

          return (
            <div key={sub.id} className="p-5 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="w-full text-left flex flex-col h-full">
                
                {/* Titre */}
                <div className="flex items-start justify-between">
                  <h4 className="text-lg font-black text-slate-900">{sub.name}</h4>
                </div>

                {/* Section Prix */}
                <div className="flex-1 flex flex-col items-start justify-center my-5">
                  {priceData ? (
                    <>
                      <div className="text-3xl font-black text-emerald-700 tracking-tight">
                        {priceData.price.toLocaleString()} <span className="text-xl font-bold">F</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-0.5">
                        Prix moyen conseillé · par {priceData.unit}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-slate-400 italic">
                      Prix moyen non renseigné
                    </div>
                  )}
                </div>

                {/* Badge de Demande */}
                <div className="mb-4">
                  <DemandBadge count={count} />
                </div>

                {/* Bouton d'action */}
                <div>
                  <button
                    type="button"
                    onClick={() => onSelect(String(sub.id), `${parentCategoryName} / ${sub.name}`)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-center transition-colors shadow-sm shadow-emerald-600/10 cursor-pointer"
                  >
                    Vendre
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Badge de demande (Refactorisé avec contrastes AA/AAA accessibles) ─────────────────

function DemandBadge({ count }: { count: number }) {
  if (count < 2) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
        🔥 Forte demande
      </span>
    );
  }
  
  if (count > 10) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-orange-50 text-orange-700 border border-orange-200">
        ⚖️ Marché concurrentiel
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200">
      📦 {count} produits disponibles
    </span>
  );
}