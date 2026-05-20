'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Truck, Loader2, RefreshCw, Navigation, Power, PowerOff, 
  Banknote, ChevronRight, Zap,Package
} from 'lucide-react';
import { useDeliveryPool } from '@/hooks/useDeliveryPool';

// Interface explicite pour les types de données de mission
interface DeliveryMission {
  deliveryId: string;
  orderId: string;
  estimatedDistanceKm: number | null;
  city: string | null;
  customerName: string | null;
  totalAmount: number | string;
}

// Composant Carte optimisé
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[24px] border border-[rgba(6,78,59,0.07)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.02)] ${className}`}>
      {children}
    </div>
  );
}

export default function AgentDeliveriesPage() {
  const {
    available, active, loading, error, claiming,
    acceptDelivery, refreshPool, toggleOnline,
  } = useDeliveryPool();

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [toggling, setToggling] = useState<boolean>(false);

  // ── Mémoïsation du calcul des gains ───────────────────────────────
  const calculGain = useCallback((km: number | null): number => {
    const base = 500;
    if (!km) return base;
    return Math.round(base + km * 200);
  }, []);

  // ── Effet 1 : Initialisation du statut de l'agent ─────────────────
  useEffect(() => {
    let alive = true;
    
    const initStatus = async () => {
      const ok = await toggleOnline(true);
      if (alive && ok) {
        setIsOnline(true);
        refreshPool();
      }
    };

    initStatus();
    return () => { alive = false; };
  }, [toggleOnline, refreshPool]);

  // ── Effet 2 : Polling découplé (Ne s'exécute que si en ligne) ──────
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      // ⚡ Ne rafraîchit pas si l'agent est déjà en train d'accepter une course
      if (!claiming) {
        refreshPool();
      }
    }, 15000); // 15 secondes

    return () => clearInterval(interval);
  }, [isOnline, refreshPool, claiming]);

  // ── Handler : Switch Statut (En ligne / Pause) ────────────────────
  const handleToggle = async () => {
    if (toggling) return;
    setToggling(true);
    
    const nextState = !isOnline;
    const ok = await toggleOnline(nextState);
    
    if (ok) {
      setIsOnline(nextState);
      if (nextState) refreshPool();
    }
    setToggling(false);
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 pb-10 font-sans">
      
      {/* Header avec Toggle Moderne */}
      <div className="flex justify-between items-center mb-8 pt-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#064E3B] m-0 font-['Space_Grotesk']">
            Missions
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isOnline ? 'bg-[#10B981] shadow-[0_0_10px_#10B981]' : 'bg-[#DC2626]'
              }`} 
            />
            <span className="text-xs text-[#64748B] font-semibold">
              {isOnline ? 'Disponible pour livrer' : 'Mode pause'}
            </span>
          </div>
        </div>

        {/* Bouton Switch iOS Style */}
        <button 
          onClick={handleToggle} 
          disabled={toggling}
          aria-label={isOnline ? "Passer hors ligne" : "Passer en ligne"}
          className={`relative w-[100px] h-11 rounded-full border-none cursor-pointer p-1 transition-all duration-300 flex items-center ${
            isOnline ? 'bg-[#064E3B]' : 'bg-[#E5E7EB]'
          } ${toggling ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          <div 
            className={`w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-all duration-300 ${
              isOnline ? 'translate-x-[56px]' : 'translate-x-0'
            }`}
          >
            {toggling ? (
              <Loader2 size={18} className="animate-spin text-[#64748B]" />
            ) : isOnline ? (
              <Power size={18} className="text-[#10B981]" strokeWidth={3} />
            ) : (
              <PowerOff size={18} className="text-[#64748B]" strokeWidth={3} />
            )}
          </div>
        </button>
      </div>

      {/* Banner de livraison active */}
      {active.length > 0 && (
        <Link href="/agent/deliveries/active" className="no-underline block mb-6 group">
          <div className="bg-gradient-to-r from-[#064E3B] to-[#10B981] rounded-[24px] p-5 color-white flex items-center justify-between shadow-[0_12px_24px_rgba(6,78,59,0.15)] transition-transform duration-200 active:scale-[0.99]">
            <div className="flex items-center gap-4 text-white">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Truck size={24} />
              </div>
              <div>
                <div className="text-base font-extrabold">En cours</div>
                <div className="text-xs text-white/90">{active.length} mission{active.length > 1 ? 's' : ''} à terminer</div>
              </div>
            </div>
            <ChevronRight size={24} className="text-white transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      )}

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
          {available.map((d: DeliveryMission) => {
            const rev = calculGain(d.estimatedDistanceKm);
            const isClaiming = claiming === d.deliveryId;
            
            return (
              <Card 
                key={d.deliveryId} 
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
                      await acceptDelivery(d.deliveryId);
                      refreshPool(); // Force le nettoyage du tableau local immédiatement après traitement
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
          })}
        </div>
      )}
    </div>
  );
}