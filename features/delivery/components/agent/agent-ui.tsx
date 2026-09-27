import React from 'react';

// Interface explicite pour les types de données de mission
export interface DeliveryMission {
  deliveryId: string;
  orderId: string;
  estimatedDistanceKm: number | null;
  city: string | null;
  customerName: string | null;
  totalAmount: number | string;
}

// Composant Carte optimisé
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[24px] border border-[rgba(6,78,59,0.07)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}

/** Gain estimé d'une mission : 500 CFA de base + 200 CFA par km. */
export function calculGain(km: number | null): number {
  const base = 500;
  if (!km) return base;
  return Math.round(base + km * 200);
}
