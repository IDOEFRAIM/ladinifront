'use client';

import React from 'react';
import { Loader2, RefreshCw, PowerOff, Zap } from 'lucide-react';
import { useDeliveryPool } from '@/features/delivery/hooks/useDeliveryPool';
import { Card, type DeliveryMission } from '@/features/delivery/components/agent/agent-ui';
import { useAgentOnline } from '@/features/delivery/components/agent/useAgentOnline';
import AgentHeader from '@/features/delivery/components/agent/AgentHeader';
import ActiveMissionBanner from '@/features/delivery/components/agent/ActiveMissionBanner';
import MissionCard from '@/features/delivery/components/agent/MissionCard';

export default function AgentDeliveriesPage() {
  const {
    available, active, loading, error, claiming,
    acceptDelivery, refreshPool, toggleOnline,
  } = useDeliveryPool();

  const { isOnline, toggling, handleToggle } = useAgentOnline(toggleOnline, refreshPool);

  return (
    <div className="max-w-[700px] mx-auto px-4 pb-10 font-sans">
      <AgentHeader isOnline={isOnline} toggling={toggling} onToggle={handleToggle} />

      {active.length > 0 && <ActiveMissionBanner count={active.length} />}

      {/* Titre de section */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xs font-extrabold text-[#64748B] uppercase tracking-widest font-['Space_Grotesk']">
          Pool de missions ({available.length})
        </h2>
        {isOnline && (
          <button 
            onClick={refreshPool} 
            disabled={loading || !!claiming}
            className="bg-none border-none text-[#10B981] text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
            Actualiser
          </button>
        )}
      </div>

      {/* ÉCRAN : Hors ligne */}
      {!isOnline && (
        <Card className="text-center py-14 px-5 bg-[#F9FBF8]">
          <PowerOff size={48} className="text-[#64748B] opacity-30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#064E3B] mb-2 font-['Space_Grotesk']">Hors ligne</h3>
          <p className="text-sm text-[#64748B] max-w-[280px] mx-auto m-0">
            Vous ne recevrez pas de missions tant que vous n'êtes pas en ligne.
          </p>
        </Card>
      )}

      {/* ÉCRAN : Loading initial */}
      {isOnline && loading && available.length === 0 && (
        <div className="text-center py-14">
          <Loader2 size={32} className="text-[#10B981] animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#64748B]">Recherche de missions disponibles...</p>
        </div>
      )}

      {/* ÉCRAN : Pool Vide */}
      {isOnline && !loading && available.length === 0 && (
        <Card className="text-center py-14 px-5 border-dashed">
          <Zap size={40} className="text-[#D97706] opacity-50 mx-auto mb-4" />
          <p className="font-bold text-[#064E3B] m-0">Rien pour l'instant</p>
          <p className="text-xs text-[#64748B] mt-1 mb-0">Dès qu'un client commande, la mission apparaîtra ici.</p>
        </Card>
      )}

      {/* LISTE DES MISSIONS DISPONIBLES */}
      {isOnline && available.length > 0 && (
        <div className="flex flex-col gap-4">
          {available.map((d: DeliveryMission) => (
            <MissionCard
              key={d.deliveryId}
              mission={d}
              claiming={claiming}
              onAccept={async (id) => {
                if (claiming) return; // Sécurité anti-double-clic
                await acceptDelivery(id);
                refreshPool();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
