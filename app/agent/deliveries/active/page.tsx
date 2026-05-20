'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Truck, Package, MapPin, Loader2, RefreshCw,
  CheckCircle2, XCircle, KeyRound, ShieldCheck,
} from 'lucide-react';

// Interface explicite pour la clarté du code et éviter les types 'any'
interface DeliveryData {
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

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/72 backdrop-blur-md rounded-[20px] border border-[rgba(6,78,59,0.07)] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] ${className}`}>
      {children}
    </div>
  );
}

export default function ActiveDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Récupération de l'historique mémoïsée ─────────────────────────
  const fetchHistory = useCallback(async (showSilentLoader = false) => {
    if (!showSilentLoader) setLoading(true);
    try {
      const res = await fetch('/api/delivery/status');
      if (res.ok) {
        const all: DeliveryData[] = await res.json();
        
        // Séparer les livraisons actives de l'historique passé
        const active = all.filter((d) => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
        const recent = all.filter((d) => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status)).slice(0, 10);
        
        setDeliveries([...active, ...recent]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Actions : Prise en charge et Clôture de course ────────────────
  const doAction = async (action: 'PICKUP' | 'CONFIRM' | 'FAILED', deliveryId: string, extra?: Record<string, string>) => {
    if (actionLoading) return; // Anti-double clic global pendant une requête
    setActionLoading(`${deliveryId}-${action}`);
    
    try {
      const isConfirmAction = action === 'CONFIRM';
      const endpoint = isConfirmAction ? '/api/delivery/confirm' : '/api/delivery/status';
      
      const payload = isConfirmAction 
        ? { deliveryId, otpCode: extra?.otpCode }
        : { action, deliveryId, ...extra };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Nettoyer l'input OTP de cette carte si l'action est validée
        if (isConfirmAction) {
          setOtpInputs(prev => {
            const next = { ...prev };
            delete next[deliveryId];
            return next;
          });
        }
        
        // Rafraîchissement silencieux des données en arrière-plan
        await fetchHistory(true);
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch {
      alert('Erreur réseau. Veuillez vérifier votre connexion.');
    } finally {
      setActionLoading(null);
    }
  };

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
            {activeDeliveries.map((d) => {
              const currentId = d.id;
              const orderRef = d.order?.id?.substring(0, 8) || d.orderId?.substring(0, 8) || '';
              const isPickupLoading = actionLoading === `${currentId}-PICKUP`;
              const isConfirmLoading = actionLoading === `${currentId}-CONFIRM`;
              const isFailedLoading = actionLoading === `${currentId}-FAILED`;
              const otpValue = otpInputs[currentId] || '';

              return (
                <Card key={currentId} className="border-2 border-[#10B981]/10">
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5 font-mono">
                        #{orderRef.toUpperCase()}
                      </div>
                      <div className="text-base font-bold text-[#064E3B] font-['Space_Grotesk']">
                        {d.order?.customerName || 'Client AgriMarket'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#64748B] mt-0.5">
                        <MapPin size={12} className="text-[#64748B]/70" /> 
                        {d.order?.city || 'Adresse renseignée'}
                      </div>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                      d.status === 'ASSIGNED' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                        : 'bg-cyan-50 text-cyan-600 border border-cyan-100'
                    }`}>
                      {d.status === 'ASSIGNED' ? (
                        <>
                          <Package size={12} /> 
                          À ramasser
                        </>
                      ) : (
                        <>
                          <Truck size={12} /> 
                          En route
                        </>
                      )}
                    </span>
                  </div>

                  {/* Actions de livraison */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-[rgba(6,78,59,0.07)]">
                    
                    {/* ÉTAPE 1 : Confirmer le ramassage chez le producteur */}
                    {d.status === 'ASSIGNED' && (
                      <button
                        onClick={() => doAction('PICKUP', currentId)}
                        disabled={actionLoading !== null}
                        className="w-full py-3 rounded-xl border-none bg-blue-600 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                      >
                        {isPickupLoading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Package size={16} /> 
                            Confirmer le ramassage
                          </>
                        )}
                      </button>
                    )}

                    {/* ÉTAPE 2 : Livraison en route -> Clôture par OTP sécurisé */}
                    {d.status === 'IN_TRANSIT' && (
                      <div className="flex flex-col gap-2">
                        <div className="relative w-full">
                          <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] opacity-50" />
                          <input
                            type="text"
                            placeholder="Code OTP du client"
                            maxLength={6}
                            value={otpValue}
                            disabled={actionLoading !== null}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [currentId]: e.target.value.replace(/\D/g, '') })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[rgba(6,78,59,0.07)] bg-white font-mono text-center text-lg font-bold text-[#064E3B] tracking-[0.4em] box-border focus:outline-none focus:border-[#10B981] disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => doAction('CONFIRM', currentId, { otpCode: otpValue })}
                            disabled={actionLoading !== null || otpValue.length < 6}
                            className="flex-1 py-3 rounded-xl border-none bg-[#10B981] text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-[#0eab76]"
                          >
                            {isConfirmLoading ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <>
                                <ShieldCheck size={16} /> 
                                Confirmer la livraison
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={() => { if (confirm('Signaler un échec définitif de livraison ?')) doAction('FAILED', currentId); }}
                            disabled={actionLoading !== null}
                            className="px-4 py-3 rounded-xl border border-red-200 bg-red-50/50 text-[#DC2626] font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 transition-colors hover:bg-red-50 disabled:opacity-50"
                          >
                            {isFailedLoading ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <XCircle size={14} /> 
                                Échec
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION : Historique des livraisons passées */}
      {pastDeliveries.length > 0 && (
        <div>
          <h2 className="text-xs font-extrabold text-[#64748B] uppercase tracking-wider mb-3 font-['Space_Grotesk']">
            Historique récent
          </h2>
          <div className="flex flex-col gap-2">
            {pastDeliveries.map((d) => (
              <Card key={d.id} className="p-3.5 flex justify-between items-center transition-shadow hover:shadow-sm">
                <div>
                  <div className="text-sm font-bold text-[#064E3B]">
                    {d.order?.customerName || 'Client'} · <span className="font-normal text-xs text-[#64748B]">{d.order?.city || '—'}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#64748B] mt-0.5">
                    {Number(d.order?.totalAmount || 0).toLocaleString()} CFA
                  </div>
                </div>
                
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                  d.status === 'DELIVERED' 
                    ? 'bg-emerald-50 text-[#10B981] border-emerald-100' 
                    : 'bg-red-50 text-[#DC2626] border-red-100'
                }`}>
                  {d.status === 'DELIVERED' ? (
                    <>
                      <CheckCircle2 size={11} /> 
                      Livré
                    </>
                  ) : (
                    <>
                      <XCircle size={11} /> 
                      Échoué
                    </>
                  )}
                </span>
              </Card>
            ))}
          </div>
        </div>
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