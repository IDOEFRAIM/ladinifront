'use client';

import React from 'react';
import { FaCheck } from 'react-icons/fa';

interface SubmitOverlayProps {
  isSubmitting: boolean;
  isSuccess: boolean;
}

export default function SubmitOverlay({ isSubmitting, isSuccess }: SubmitOverlayProps) {
  // Court-circuit si aucun état n'est actif
  if (!isSubmitting && !isSuccess) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        
        {!isSuccess ? (
          <>
            {/* Spinner natif optimisé */}
            <div className="relative w-16 h-16 mb-6" aria-hidden="true">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">
              Envoi en cours...
            </h2>
          </>
        ) : (
          <div className="animate-in zoom-in duration-300 flex flex-col items-center">
            {/* Conteneur de validation avec micro-animation d'impact */}
            <div 
              className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-sm animate-in zoom-in-75 duration-500 scale-100"
              aria-hidden="true"
            >
              <FaCheck size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wide">
              Terminé !
            </h2>
          </div>
        )}

      </div>
    </div>
  );
}