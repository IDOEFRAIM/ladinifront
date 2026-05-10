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
    <div className="space-y-6 animate-in slide-in-from-right-10">
      <div className="grid grid-cols-3 gap-3">
        {totalImages < MAX_IMAGES && (
          <label className="aspect-square bg-slate-200 rounded-3xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform">
            <FaCamera className="text-2xl text-slate-400" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddImage(file);
              }}
            />
          </label>
        )}

        {existingImages.map((url, i) => (
          <div key={`ex-${i}`} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-slate-200">
            <img src={normalizeAssetUrl(url, 'products')} className="w-full h-full object-cover" alt="existing" />
            <button
              type="button"
              onClick={() => onRemoveExisting(i)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ))}

        {newPreviews.map((src, i) => (
          <div key={`nw-${i}`} className="relative aspect-square rounded-3xl overflow-hidden border-4 border-green-500">
            <img src={src} className="w-full h-full object-cover" alt="new" />
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full"
            >
              <FaTrash size={10} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={totalImages === 0}
        onClick={onNext}
        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl disabled:opacity-30"
      >
        Continuer
      </button>
    </div>
  );
}
