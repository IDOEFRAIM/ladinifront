'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Truck, Clock, MapPin, Package, User, Loader2, RefreshCw, 
  Navigation, Power, PowerOff, ArrowRight, Banknote, ChevronRight, Zap,
  AlertCircle
} from 'lucide-react';
import { useDeliveryPool } from '@/hooks/useDeliveryPool';

// Constantes de Design
const C = { 
  forest: '#064E3B', 
  emerald: '#10B981', 
  amber: '#D97706', 
  red: '#DC2626', 
  sand: '#F9FBF8', 
  glass: 'rgba(255,255,255,0.72)', 
  border: 'rgba(6,78,59,0.07)', 
  muted: '#64748B', 
  text: '#1F2937' 
};

const F = { 
  heading: "'Space Grotesk', sans-serif", 
  body: "'Inter', sans-serif" 
};

// Composant Carte réutilisable
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ 
      background: '#fff', 
      borderRadius: 24, 
      border: `1px solid ${C.border}`, 
      padding: 20, 
      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
      ...style 
    }}>
      {children}
    </div>
  );
}

export default function AgentDeliveriesPage() {
  const {
    available, active, loading, error, claiming,
    acceptDelivery, refreshPool, toggleOnline,
  } = useDeliveryPool();

  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Synchronisation initiale et Polling
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      const ok = await toggleOnline(true);
      if (mounted && ok) {
        setIsOnline(true);
        refreshPool();
      }
    };

    init();
    
    // Rafraîchissement automatique toutes les 15 secondes
    const interval = setInterval(() => {
      if (isOnline) refreshPool();
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [toggleOnline, refreshPool, isOnline]);

  const handleToggle = async () => {
    setToggling(true);
    const nextState = !isOnline;
    const ok = await toggleOnline(nextState);
    if (ok) setIsOnline(nextState);
    setToggling(false);
  };

  const estRevenue = (km: number | null) => {
    const base = 500;
    if (!km) return base;
    return Math.round(base + km * 200);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 40px' }}>
      
      {/* Header avec Toggle Moderne */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: 32, paddingTop: 20 
      }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.75rem', fontWeight: 800, color: C.forest, margin: 0 }}>
            Missions
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div style={{ 
              width: 8, height: 8, borderRadius: '50%', 
              background: isOnline ? C.emerald : C.red,
              boxShadow: isOnline ? `0 0 10px ${C.emerald}` : 'none' 
            }} />
            <span style={{ fontFamily: F.body, fontSize: 13, color: C.muted, fontWeight: 600 }}>
              {isOnline ? 'Disponible pour livrer' : 'Mode pause'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleToggle} 
          disabled={toggling}
          style={{
            position: 'relative', width: 100, height: 44, borderRadius: 100,
            background: isOnline ? C.forest : '#E5E7EB', border: 'none', cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', display: 'flex', alignItems: 'center',
            padding: '0 4px'
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: isOnline ? 'translateX(56px)' : 'translateX(0px)',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            {toggling ? (
              <Loader2 size={18} className="animate-spin" color={C.muted} />
            ) : isOnline ? (
              <Power size={18} color={C.emerald} strokeWidth={3} />
            ) : (
              <PowerOff size={18} color={C.muted} strokeWidth={3} />
            )}
          </div>
        </button>
      </div>

      {/* Banner de livraison active */}
      {active.length > 0 && (
        <Link href="/agent/deliveries/active" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
            borderRadius: 24, padding: '20px', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 12px 24px rgba(6,78,59,0.15)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 16, background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <Truck size={24} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>En cours</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>{active.length} mission{active.length > 1 ? 's' : ''} à terminer</div>
              </div>
            </div>
            <ChevronRight size={24} />
          </div>
        </Link>
      )}

      {/* Titre de section */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Pool de missions ({available.length})
        </h2>
        {isOnline && (
          <button 
            onClick={refreshPool} 
            disabled={loading}
            style={{ 
              background: 'none', border: 'none', color: C.emerald, 
              fontSize: 13, fontWeight: 700, cursor: 'pointer', 
              display: 'flex', alignItems: 'center', gap: 6 
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 
            Actualiser
          </button>
        )}
      </div>

      {/* États de l'interface */}
      {!isOnline && (
        <Card style={{ textAlign: 'center', padding: '60px 20px', background: C.sand }}>
          <PowerOff size={48} color={C.muted} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontFamily: F.heading, color: C.forest, margin: '0 0 8px', fontSize: '1.2rem' }}>Hors ligne</h3>
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14, maxWidth: 280, margin: '0 auto' }}>
            Vous ne recevrez pas de missions tant que vous n'êtes pas en ligne.
          </p>
        </Card>
      )}

      {isOnline && loading && available.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={32} color={C.emerald} className="animate-spin" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: C.muted, fontSize: 14 }}>Recherche de missions disponibles...</p>
        </div>
      )}

      {isOnline && !loading && available.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
          <Zap size={40} color={C.amber} style={{ opacity: 0.5, marginBottom: 16 }} />
          <p style={{ fontWeight: 700, color: C.forest, margin: 0 }}>Rien pour l'instant</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Dès qu'un client commande, la mission apparaîtra ici.</p>
        </Card>
      )}

      {/* Liste des Missions */}
      {isOnline && available.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {available.map((d) => {
            const rev = estRevenue(d.estimatedDistanceKm);
            const isClaiming = claiming === d.deliveryId;
            
            return (
              <Card key={d.deliveryId} style={{ padding: 0, overflow: 'hidden' }}>
                {/* En-tête Mission */}
                <div style={{
                  background: 'rgba(6, 78, 59, 0.03)',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${C.border}`
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1 }}>
                    #{d.orderId?.substring(0, 8).toUpperCase()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.emerald, fontWeight: 800 }}>
                    <Banknote size={16} />
                    <span>{rev.toLocaleString()} CFA</span>
                  </div>
                </div>

                <div style={{ padding: 20 }}>
                  {/* Itinéraire */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.emerald, border: '3px solid #fff', boxShadow: `0 0 0 1px ${C.emerald}` }} />
                      <div style={{ width: 2, flex: 1, background: `repeating-linear-gradient(to bottom, ${C.emerald} 0, ${C.emerald} 4px, transparent 4px, transparent 8px)`, margin: '4px 0' }} />
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.amber, border: '3px solid #fff', boxShadow: `0 0 0 1px ${C.amber}` }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 2 }}>Enlèvement</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Ferme Producteur (Point A)</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', marginBottom: 2 }}>Livraison</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{d.city || 'Adresse client'}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{d.customerName || 'Client AgriMarket'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Badges Info */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <div style={{ background: C.sand, padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.forest }}>
                      <Navigation size={14} color={C.emerald} />
                      {d.estimatedDistanceKm || '0'} km
                    </div>
                    <div style={{ background: C.sand, padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.forest }}>
                      <Package size={14} color={C.amber} />
                      {Number(d.totalAmount).toLocaleString()} CFA
                    </div>
                  </div>

                  {/* Bouton d'action */}
                  <button
                    onClick={() => acceptDelivery(d.deliveryId)}
                    disabled={isClaiming}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 16,
                      border: 'none',
                      background: C.forest,
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      boxShadow: '0 4px 12px rgba(6,78,59,0.2)',
                      transition: 'all 0.2s ease',
                      opacity: isClaiming ? 0.7 : 1
                    }}
                  >
                    {isClaiming ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Truck size={20} />
                        Accepter la mission
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