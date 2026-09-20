import React from 'react';

// Interface explicite pour la clarté du code et éviter les types 'any'
export interface DeliveryData {
  id: string;
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  orderId?: string;
  order?: {
    id: string;
    customerName: string;
    city: string;
    totalAmount: number | string;
  };
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/72 backdrop-blur-md rounded-[20px] border border-[rgba(6,78,59,0.07)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] ${className}`}>
      {children}
    </div>
  );
}
