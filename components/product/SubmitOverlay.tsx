'use client';

import React from 'react';
import { FaCheck, FaSpinner } from 'react-icons/fa';

interface SubmitOverlayProps {
  isSubmitting: boolean;
  isSuccess: boolean;
}

export default function SubmitOverlay({ isSubmitting, isSuccess }: SubmitOverlayProps) {
  if (!isSubmitting && !isSuccess) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-6">
      <div className="bg-white w-full max-w-xs rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl animate-in fade-in zoom-in duration-300">
        {!isSuccess ? (
          <>
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
            </div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Envoi...</h2>
          </>
        ) : (
          <div className="animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheck size={36} className="animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">Terminé !</h2>
          </div>
        )}
      </div>
    </div>
  );
}
