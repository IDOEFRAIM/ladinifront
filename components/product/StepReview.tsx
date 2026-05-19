'use client';

import React, { useMemo } from 'react';
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
  
  // Mémoïsation de la source d'image pour éviter les recalculs superflus
  const imgSrc = useMemo(() => {
    return firstPreview || (firstExistingImage ? normalizeAssetUrl(firstExistingImage, 'products') : '');
  }, [firstPreview, firstExistingImage]);

  // Validation logique de l'état de soumission
  const canSubmit = useMemo(() => {
    return !!name.trim() && !!quantity && Number(price) > 0;
  }, [name, quantity, price]);

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-500">
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-100">
        
        {/* En-tête avec Image de couverture */}
        <div className="h-56 bg-slate-900 relative overflow-hidden">
          {imgSrc ? (
            <img 
              src={imgSrc} 
              className="w-full h-full object-cover select-none" 
              alt={`Aperçu de ${name}`}
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
              <span className="text-xs font-bold text-slate-500 italic">Aucune image sélectionnée</span>
            </div>
          )}
          {/* Dégradé accentué pour lisibilité maximale des textes blancs */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          
          <div className="absolute bottom-5 left-6 right-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              {categoryLabel || 'Catégorie non spécifiée'}
            </p>
            <h2 className="text-2xl font-black tracking-tight mt-0.5 truncate">
              {name.trim() || 'Produit sans nom'}
            </h2>
            {description && (
              <p className="text-xs mt-1.5 opacity-90 line-clamp-2 font-medium text-slate-200">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          
          {/* Informations Quantité & Prix */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité en Stock</p>
              <p className="text-lg font-black text-slate-800 mt-1">
                {quantity} <span className="text-sm font-bold text-slate-500">{unit}</span>
              </p>
            </div>
            
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-600/5 text-right">
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Prix unitaire</p>
              <p className="text-lg font-black text-emerald-800 mt-1">
                {Number(price).toLocaleString()} <span className="text-sm font-bold text-emerald-600">F</span>
              </p>
            </div>
          </div>

          {/* Indicateur de Note Vocale accessible */}
          {hasAudio && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-emerald-50 text-emerald-950 rounded-2xl border border-emerald-200/60 animate-in slide-in-from-left-4 duration-300">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-600/10 shrink-0">
                <FaMicrophone size={15} />
              </div>
              <div className="truncate">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Note Vocale</p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">Enregistrement audio joint</p>
              </div>
            </div>
          )}

          {/* Bouton de Soumission */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4.5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.99]"
          >
            {isSubmitting ? (
              <FaSpinner className="animate-spin text-lg" />
            ) : (
              <FaSave className="text-base" />
            )}
            <span>
              {isSubmitting ? 'Envoi...' : mode === 'create' ? 'Publier l\'offre' : 'Enregistrer les modifications'}
            </span>
          </button>
          
        </div>
      </div>
    </div>
  );
}