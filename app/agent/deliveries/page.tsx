'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck, Clock, MapPin, Package, User, Loader2, RefreshCw,
  Navigation, Power, PowerOff, ArrowRight, Banknote, ChevronRight, Zap,
} from 'lucide-react';
import { useDeliveryPool } from '@/hooks/useDeliveryPool';

const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#DC2626', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, ...style }}>{children}</div>;
}

export default function AgentDeliveriesPage() {
  const {
    available, active, loading, error, claiming,
    acceptDelivery, refreshPool, toggleOnline,
  } = useDeliveryPool();

  const [isOnline, setIsOnline] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Auto-go-online on mount so server actually returns deliveries
  useEffect(() => {
    const goOnline = async () => {
      const ok = await toggleOnline(true);
      if (ok) {
        setIsOnline(true);
        refreshPool();
      }
    };
    goOnline();
  }, [toggleOnline, refreshPool]);

  const handleToggle = async () => {
    setToggling(true);
    const ok = await toggleOnline(!isOnline);
    if (ok) setIsOnline(!isOnline);
    setToggling(false);
  };

  const handleAccept = async (deliveryId: string) => {
    const result = await acceptDelivery(deliveryId);
    if (result.success) {
      // nothing — optimistic update already done
    } else {
      alert(result.error || 'Déjà prise par un autre livreur');
    }
  };

  // Estimate revenue (flat 500 + 200/km)
  const estRevenue = (km: number | null) => {
    if (!km) return 500;
    return Math.round(500 + km * 200);
  };
console.log('active',active);
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest, margin: 0 }}>
            <Zap size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: C.amber }} />
            Missions disponibles bob
          </h1>
          <p style={{ fontFamily: F.body, fontSize: 13, color: C.muted, margin: '2px 0 0' }}>
            Premier arrivé, premier servi · {available.length} mission{available.length > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleToggle} disabled={toggling} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 100,
            border: 'none', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 700,
            background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(220,38,38,0.1)',
            color: isOnline ? C.emerald : C.red,
          }}>
            {isOnline ? <><Power size={14} /> En ligne</> : <><PowerOff size={14} /> Hors ligne</>}
          </button>
          <button onClick={refreshPool} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 100, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>
            <RefreshCw size={14} color={C.muted} />
          </button>
        </div>
      </div>

      {/* Active delivery banner */}
      {active.length > 0 && (
        <Link href="/agent/deliveries/active" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
          <div style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
            borderRadius: 16, padding: '14px 20px', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', animation: 'pulse 2s infinite' }} />
              <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700 }}>
                {active.length} livraison{active.length > 1 ? 's' : ''} en cours
              </span>
            </div>
            <ChevronRight size={18} />
          </div>
        </Link>
      )}

      {/* Offline */}
      {!isOnline && (
        <Card style={{ textAlign: 'center', padding: 40, marginBottom: 20 }}>
          <PowerOff size={36} color={C.muted} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 600, margin: 0 }}>Vous êtes hors ligne</p>
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: 12, margin: '4px 0 0' }}>Passez en ligne pour voir les missions</p>
        </Card>
      )}

      {/* Loading */}
      {isOnline && loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 12 }}>
          <Loader2 size={28} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: 13 }}>Recherche de missions...</p>
        </div>
      )}

      {/* Empty */}
      {isOnline && !loading && available.length === 0 && (
        <Card style={{ textAlign: 'center', padding: 40 }}>
          <Truck size={36} color={C.muted} style={{ marginBottom: 10, opacity: 0.4 }} />
          <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 600, margin: '0 0 4px' }}>Aucune mission disponible</p>
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: 12, margin: 0 }}>Les nouvelles commandes payées apparaîtront ici automatiquement</p>
        </Card>
      )}

      {/* Mission cards */}
      {isOnline && !loading && available.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {available.map((d) => {
            const rev = estRevenue(d.estimatedDistanceKm);
            const isClaiming = claiming === d.deliveryId;
            return (
              <Card key={d.deliveryId} style={{ padding: 0, overflow: 'hidden' }}>
                {/* Revenue banner */}
                <div style={{
                  background: `linear-gradient(90deg, ${C.forest}08, ${C.emerald}10)`,
                  padding: '10px 20px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    MISSION #{d.orderId?.substring(0, 8)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.emerald }}>
                    <Banknote size={14} /> ~{rev.toLocaleString()} CFA
                  </span>
                </div>

                <div style={{ padding: 20 }}>
                  {/* Route visualization */}
                  <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 16 }}>
                    {/* Dots + line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, paddingTop: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.emerald, border: '2px solid #fff', boxShadow: `0 0 0 2px ${C.emerald}` }} />
                      <div style={{ width: 2, flex: 1, background: `repeating-linear-gradient(to bottom, ${C.emerald} 0, ${C.emerald} 4px, transparent 4px, transparent 8px)`, margin: '4px 0' }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.amber, border: '2px solid #fff', boxShadow: `0 0 0 2px ${C.amber}` }} />
                    </div>
                    {/* Addresses */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: 0.8 }}>Point A · Producteur</div>
                        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>
                          {d.originGpsLat && d.originGpsLng
                            ? `${Number(d.originGpsLat).toFixed(3)}, ${Number(d.originGpsLng).toFixed(3)}`
                            : 'À récupérer'
                          }
                        </div>
                      </div>
                      <div>
                        <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: 0.8 }}>Point B · Client</div>
                        <div style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.text }}>
                          {d.city || d.deliveryDesc || 'Destination non précisée'}
                        </div>
                        <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2 }}>
                          <User size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                          {d.customerName || 'Client'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    {d.estimatedDistanceKm && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: C.sand, border: `1px solid ${C.border}` }}>
                        <Navigation size={13} color={C.emerald} />
                        <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.forest }}>{d.estimatedDistanceKm} km</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: C.sand, border: `1px solid ${C.border}` }}>
                      <Package size={13} color={C.amber} />
                      <span style={{ fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.forest }}>{Number(d.totalAmount).toLocaleString()} CFA</span>
                    </div>
                    {d.createdAt && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 10, background: C.sand, border: `1px solid ${C.border}` }}>
                        <Clock size={13} color={C.muted} />
                        <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{new Date(d.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Accept button */}
                  <button
                    onClick={() => handleAccept(d.deliveryId)}
                    disabled={isClaiming}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '14px 24px', borderRadius: 14, border: 'none',
                      background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
                      color: '#fff', cursor: 'pointer',
                      fontFamily: F.body, fontSize: 14, fontWeight: 700,
                      opacity: isClaiming ? 0.6 : 1,
                      boxShadow: '0 4px 16px rgba(6,78,59,0.15)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isClaiming ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <><Truck size={16} /> Accepter cette mission</>
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
