"use client";

import React from 'react';

type Props = {
  phone?: string | null;
};

export default function CallButton({ phone }: Props) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!phone) return;
    if (typeof window !== 'undefined') {
      window.open(`tel:${phone}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="bg-[#2D3436] text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm hover:bg-[#497A3A] transition-colors"
    >
      Appeler
    </button>
  );
}
