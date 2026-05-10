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
    <div>
      <div className="mb-4 flex items-center gap-4">
        <button type="button" onClick={onBack} className="px-3 py-2 bg-slate-100 rounded-xl">
          ← Retour
        </button>
        <h3 className="font-black">Choisissez une sous-catégorie</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {subCategories.map((sub) => {
          const count = sub._count?.products ?? 0;
          const priceData = resolvePrice(sub);

          return (
            <div key={sub.id} className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100">
              <div className="w-full text-left flex flex-col h-full">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-black text-slate-800">{sub.name}</h3>
                </div>

                <div className="flex-1 flex flex-col items-start justify-center mt-4">
                  {priceData ? (
                    <>
                      <div className="text-3xl font-black text-green-700">
                        {priceData.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        Prix moyen conseillé · F/{priceData.unit}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-500">Prix moyen non renseigné</div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <DemandBadge count={count} />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => onSelect(String(sub.id), `${parentCategoryName} / ${sub.name}`)}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-center"
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

// ── Badge de demande (extrait pour DRY) ────────────────────────────────

function DemandBadge({ count }: { count: number }) {
  if (count < 2) {
    return (
      <span
        className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-black text-white"
        style={{ background: '#bbf7d0' }}
      >
        Forte demande
      </span>
    );
  }
  if (count > 10) {
    return (
      <span
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-black text-white"
        style={{ background: '#fb923c' }}
      >
        Marché concurrentiel
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-black text-white"
      style={{ background: '#94a3b8' }}
    >
      {count} produits
    </span>
  );
}
