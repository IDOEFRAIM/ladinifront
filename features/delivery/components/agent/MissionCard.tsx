'use client';

import { Truck, Loader2, Navigation, Banknote, Package } from 'lucide-react';
import { Card, calculGain, type DeliveryMission } from '@/features/delivery/components/agent/agent-ui';

interface Props {
  mission: DeliveryMission;
  claiming: string | null;
  /** Accepte la mission puis rafraîchit le pool (nettoyage immédiat du tableau local). */
  onAccept: (deliveryId: string) => Promise<void>;
}

export default function MissionCard({ mission: d, claiming, onAccept }: Props) {
  const rev = calculGain(d.estimatedDistanceKm);
  const isClaiming = claiming === d.deliveryId;
  return (
<Card 
  
  className={`p-0 overflow-hidden transition-all duration-200 ${
    isClaiming ? 'opacity-60 pointer-events-none' : 'hover:shadow-[0_6px_16px_rgba(0,0,0,0.04)]'
  }`}
>
  {/* En-tête Mission */}
  <div className="bg-[#064E3B]/[0.03] px-5 py-3 flex justify-between items-center border-b border-[rgba(6,78,59,0.07)]">
    <span className="text-[11px] font-extrabold text-[#64748B] tracking-wider font-mono">
      #{d.orderId?.substring(0, 8).toUpperCase()}
    </span>
    <div className="flex items-center gap-1.5 text-[#10B981] font-extrabold text-sm">
      <Banknote size={16} />
      <span>{rev.toLocaleString()} CFA</span>
    </div>
  </div>

  {/* Corps de la carte */}
  <div className="p-5">
    {/* Itinéraire graphique vertical */}
    <div className="flex gap-4 mb-5">
      <div className="flex flex-col items-center pt-1">
        <div className="w-3 h-3 rounded-full bg-[#10B981] border-2 border-white ring-1 ring-[#10B981]" />
        <div className="w-0.5 flex-1 bg-auto my-1 border-l border-dashed border-[#10B981]" />
        <div className="w-3 h-3 rounded-full bg-[#D97706] border-2 border-white ring-1 ring-[#D97706]" />
      </div>
      
      <div className="flex-1 flex flex-col gap-5">
        <div>
          <div className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider mb-0.5">Enlèvement</div>
          <div className="text-sm font-semibold text-[#1F2937]">Ferme Producteur (Point A)</div>
        </div>
        <div>
          <div className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider mb-0.5">Livraison</div>
          <div className="text-sm font-semibold text-[#1F2937]">{d.city || 'Adresse client'}</div>
          <div className="text-xs text-[#64748B] mt-0.5">{d.customerName || 'Client AgriMarket'}</div>
        </div>
      </div>
    </div>

    {/* Badges Spécifications */}
    <div className="flex gap-2 mb-5">
      <div className="bg-[#F9FBF8] px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-[#064E3B]">
        <Navigation size={14} className="text-[#10B981]" />
        {d.estimatedDistanceKm || '0'} km
      </div>
      <div className="bg-[#F9FBF8] px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-[#064E3B]">
        <Package size={14} className="text-[#D97706]" />
        {Number(d.totalAmount).toLocaleString()} CFA
      </div>
    </div>

    {/* Bouton d'action principale */}
    <button
      onClick={async () => {
        if (claiming) return; // Sécurité anti-double-clic
        await onAccept(d.deliveryId);
      }}
      disabled={!!claiming}
      className="w-full py-4 rounded-2xl border-none bg-[#064E3B] text-white text-sm font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(6,78,59,0.2)] transition-all active:scale-[0.98] disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed hover:bg-[#064E3B]/90"
    >
      {isClaiming ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          <span>Assignation en cours...</span>
        </>
      ) : claiming ? (
        <span>Veuillez patienter...</span>
      ) : (
        <>
          <Truck size={20} />
          <span>Accepter la mission</span>
        </>
      )}
    </button>
  </div>

</Card>
  );
}
