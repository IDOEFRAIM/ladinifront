'use client';

import React from 'react';
import { Truck, Loader2, RefreshCw } from 'lucide-react';
import { Card } from '@/features/delivery/components/active/delivery-ui';
import { useActiveDeliveries } from '@/features/delivery/components/active/useActiveDeliveries';
import ActiveDeliveryCard from '@/features/delivery/components/active/ActiveDeliveryCard';
import PastDeliveriesList from '@/features/delivery/components/active/PastDeliveriesList';

export default function ActiveDeliveriesPage() {
  const { deliveries, loading, otpInputs, setOtpInputs, actionLoading, fetchHistory, doAction } = useActiveDeliveries();

  // Loader d'état initial de la page
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 size={32} className="text-[#10B981] animate-spin" />
      <p className="text-sm font-medium text-[#64748B]">Chargement de vos courses...</p>
    </div>
  );

  const activeDeliveries = deliveries.filter(d => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
  const pastDeliveries = deliveries.filter(d => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status));

  return (
    <div className="max-w-[700px] mx-auto px-4 pb-10 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-xl font-extrabold tracking-tight text-[#064E3B] m-0 font-['Space_Grotesk']">
          Mes livraisons
        </h1>
        <button 
          onClick={() => fetchHistory()} 
          disabled={actionLoading !== null}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[rgba(6,78,59,0.07)] bg-white text-xs font-bold text-[#64748B] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* SECTION : Livraisons Actives */}
      {activeDeliveries.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-[#064E3B] mb-3 flex items-center gap-2 font-['Space_Grotesk']">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            En cours
          </h2>
          <div className="flex flex-col gap-3">
            {activeDeliveries.map((d) => (
              <ActiveDeliveryCard
                key={d.id}
                delivery={d}
                actionLoading={actionLoading}
                otpValue={otpInputs[d.id] || ''}
                onOtpChange={(id, value) => setOtpInputs({ ...otpInputs, [id]: value })}
                onAction={doAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* SECTION : Historique des livraisons passées */}
      {pastDeliveries.length > 0 && (
        <PastDeliveriesList deliveries={pastDeliveries} />
      )}

      {/* Aucun élément dans l'historique et état vide */}
      {deliveries.length === 0 && !loading && (
        <Card className="text-center py-12 px-4 border-dashed">
          <Truck size={40} className="text-[#64748B] opacity-35 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#64748B] m-0">Aucune livraison enregistrée pour le moment</p>
        </Card>
      )}
    </div>
  );
}
