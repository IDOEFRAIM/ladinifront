'use client';

import React from 'react';
import { FaCamera, FaTrash } from 'react-icons/fa';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import { MAX_IMAGES } from '@/types/product-flow';

interface StepPhotosProps {
  existingImages: string[];
  newPreviews: string[];
  totalImages: number;
  onAddImage: (file: File) => void;
  onRemoveExisting: (index: number) => void;
  onRemoveNew: (index: number) => void;
  onNext: () => void;
}

export default function StepPhotos({
  existingImages,
  newPreviews,
  totalImages,
  onAddImage,
  onRemoveExisting,
  onRemoveNew,
  onNext,
}: StepPhotosProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
      
      {/* Grille de photos */}
      <div className="grid grid-cols-3 gap-3">
        
        {/* Case de téléversement (Upload) */}
        {totalImages < MAX_IMAGES && (
          <label className="aspect-square bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all group">
            <FaCamera className="text-xl text-slate-400 group-hover:text-emerald-600 transition-colors" />
            <span className="text-[10px] font-bold text-slate-400 mt-2 group-hover:text-emerald-700 transition-colors">
              Ajouter ({totalImages}/{MAX_IMAGES})
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onAddImage(file);
                  e.target.value = ''; // Permet de re-sélectionner le même fichier si supprimé entre-temps
                }
              }}
            />
          </label>
        )}

        {/* Liste des images déjà existantes (Mode édition) */}
        {existingImages.map((url, i) => (
          <div key={`ex-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
            <img 
              src={normalizeAssetUrl(url, 'products')} 
              className="w-full h-full object-cover select-none" 
              alt="Déjà en ligne" 
              decoding="async"
            />
            <button
              type="button"
              onClick={() => onRemoveExisting(i)}
              className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
              aria-label="Supprimer cette photo"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ))}

        {/* Liste des nouvelles images ajoutées (Previews) */}
        {newPreviews.map((src, i) => (
          <div key={`nw-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-sm">
            <img 
              src={src} 
              className="w-full h-full object-cover select-none" 
              alt="Nouvel aperçu" 
              decoding="async"
            />
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              className="absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-colors cursor-pointer"
              aria-label="Supprimer cette photo"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Bouton d'action principal */}
      <button
        type="button"
        disabled={totalImages === 0}
        onClick={onNext}
        className="w-full bg-emerald-950 hover:bg-emerald-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md select-none active:scale-[0.99]"
      >
        Continuer
      </button>
    </div>
  );
}