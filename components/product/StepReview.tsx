'use client';

import React from 'react';
import { FaMicrophone, FaSave, FaSpinner } from 'react-icons/fa';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import type { ProductFlowMode } from '@/types/product-flow';

interface StepReviewProps {
  mode: ProductFlowMode;
  name: string;
  categoryLabel: string;
  description: string;
  price: string;
  quantity: string;
  unit: string;
  firstPreview: string | null;
  firstExistingImage: string | null;
  hasAudio: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export default function StepReview({
  mode,
  name,
  categoryLabel,
  description,
  price,
  quantity,
  unit,
  firstPreview,
  firstExistingImage,
  hasAudio,
  isSubmitting,
  onSubmit,
}: StepReviewProps) {
  const imgSrc = firstPreview || (firstExistingImage ? normalizeAssetUrl(firstExistingImage, 'products') : '');
  const canSubmit = !!name && !!quantity && Number(price) > 0;

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white">
        {/* Hero image */}
        <div className="h-52 bg-slate-100 relative">
          {imgSrc && (
            <img src={imgSrc} className="w-full h-full object-cover" alt="review" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
              {categoryLabel}
            </p>
            <h2 className="text-2xl font-black italic">{name || 'Produit sans nom'}</h2>
            {description && (
              <p className="text-xs mt-1 opacity-90 line-clamp-2">{description}</p>
            )}
          </div>
        </div>

        <div className="p-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock</p>
              <p className="text-xl font-black text-slate-800 italic">{quantity} {unit}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-green-600 uppercase tracking-widest">Prix</p>
              <p className="text-xl font-black text-green-700 italic">
                {Number(price).toLocaleString()} F
              </p>
            </div>
          </div>

          {/* Audio indicator */}
          {hasAudio && (
            <div className="flex items-center gap-3 mb-8 p-4 bg-green-50 rounded-2xl border border-green-100 animate-in slide-in-from-left-5">
              <div className="w-10 h-10 bg-green-200 text-green-700 rounded-full flex items-center justify-center shadow-sm">
                <FaMicrophone size={16} />
              </div>
              <div>
                <p className="text-[9px] font-black text-green-800 uppercase tracking-widest">Note Vocale</p>
                <p className="text-xs font-bold text-green-700">Enregistrement prêt à l'envoi</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}
            className="w-full bg-green-600 text-white py-6 rounded-[2.2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-200 flex items-center justify-center gap-4 hover:bg-green-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {mode === 'create' ? 'Publier' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
