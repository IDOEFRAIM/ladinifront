'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Truck, Clock, CheckCircle2, Package, MapPin, Phone, User,
  Loader2, ArrowLeft, RefreshCw, ShieldCheck, AlertTriangle, Copy, Check,
  ChefHat, UserCheck,
} from 'lucide-react';

const C = { forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#DC2626', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

const STEP_ICONS: Record<string, any> = {
  PLACED: Package,
  CONFIRMED: CheckCircle2,
  PROCESSING: ChefHat,
  ASSIGNED: UserCheck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
};

function formatTime(ts: string | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/buyer/tracking/${orderId}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Commande introuvable' : 'Erreur de chargement');
      setData(await res.json());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(fetchTracking, 30000);
    return () => clearInterval(interval);
  }, [orderId, fetchTracking]);

  const copyOTP = () => {
    if (data?.delivery?.deliveryCode) {
      navigator.clipboard.writeText(data.delivery.deliveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !data) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <Loader2 size={32} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14 }}>Chargement du suivi...</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <AlertTriangle size={40} color={C.red} style={{ marginBottom: 12 }} />
      <p style={{ fontFamily: F.body, color: C.red, marginBottom: 16 }}>{error}</p>
      <button onClick={() => router.push('/buyer-dashboard')} style={{ padding: '10px 24px', borderRadius: 100, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: F.body, color: C.forest }}>
        Retour au tableau de bord
      </button>
    </div>
  );

  const { order, delivery, timeline, isFailed, items } = data || {};

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.push('/buyer-dashboard')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer' }}>
          <ArrowLeft size={18} color={C.forest} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 800, color: C.forest, margin: 0 }}>
            Suivi de commande
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>REF #{orderId?.substring(0, 8)}</span>
            {order && (
              <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: `${order.statusColor}14`, color: order.statusColor }}>
                {order.statusLabel}
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchTracking} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 100, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 600, color: C.muted }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Delivery code card */}
      {delivery?.deliveryCode && order?.status !== 'DELIVERED' && (
        <div style={{ background: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)', borderRadius: 20, padding: 24, marginBottom: 20, color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: F.body, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.7, marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Code de livraison
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2rem', fontWeight: 800, letterSpacing: 6 }}>
                {delivery.deliveryCode}
              </div>
              <div style={{ fontFamily: F.body, fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                Communiquez ce code au livreur pour confirmer la réception
              </div>
            </div>
            <button onClick={copyOTP} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff', fontFamily: F.body, fontSize: 12, fontWeight: 600 }}>
              {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
            </button>
          </div>
        </div>
      )}

      {/* Timeline stepper — driven by server-computed timeline */}
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: F.heading, fontSize: '0.9rem', fontWeight: 700, color: C.forest, margin: '0 0 20px' }}>Progression</h3>

        {isFailed ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <AlertTriangle size={40} color={C.red} style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: F.body, color: C.red, fontWeight: 700, margin: 0 }}>Livraison échouée</p>
            <p style={{ fontFamily: F.body, color: C.muted, fontSize: 13, margin: '4px 0 0' }}>Notre équipe va vous recontacter</p>
          </div>
        ) : timeline?.length > 0 ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
            {timeline.map((step: any, i: number) => {
              const Icon = STEP_ICONS[step.step] || Clock;
              return (
                <div key={step.step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {i > 0 && (
                    <div style={{ position: 'absolute', top: 18, right: '50%', left: '-50%', height: 3, borderRadius: 2, background: step.reached ? C.emerald : C.border, zIndex: 0, transition: 'background 0.5s' }} />
                  )}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: step.reached ? `${step.color}18` : C.sand, border: `2px solid ${step.reached ? step.color : C.border}`, zIndex: 1, transition: 'all 0.5s' }}>
                    <Icon size={16} color={step.reached ? step.color : C.muted} />
                  </div>
                  <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 700, color: step.reached ? step.color : C.muted, marginTop: 8, textAlign: 'center', lineHeight: 1.3 }}>
                    {step.label}
                  </span>
                  {step.timestamp && (
                    <span style={{ fontFamily: F.body, fontSize: 9, color: C.muted, marginTop: 2 }}>
                      {formatTime(step.timestamp)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Order items */}
      {items?.length > 0 && (
        <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '0.9rem', fontWeight: 700, color: C.forest, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} /> Articles
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((item: any) => (
              <div key={item.id || item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: F.body, fontSize: 14, color: C.text, fontWeight: 500 }}>
                  {item.product?.name || 'Produit'} × {item.quantity}
                </span>
                <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, color: C.forest }}>
                  {(item.quantity * item.priceAtSale).toLocaleString()} CFA
                </span>
              </div>
            ))}
            {order && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontFamily: F.heading, fontWeight: 800, fontSize: '1.1rem', color: C.forest }}>
                <span>Total</span>
                <span>{Number(order.totalAmount).toLocaleString()} CFA</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery agent info */}
      {delivery?.agent && (
        <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '0.9rem', fontWeight: 700, color: C.forest, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={16} /> Votre livreur
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={22} color={C.forest} />
            </div>
            <div>
              <div style={{ fontFamily: F.heading, fontWeight: 700, color: C.forest }}>{delivery.agent.user?.name || 'Livreur'}</div>
              {delivery.agent.user?.phone && (
                <a href={`tel:${delivery.agent.user.phone}`} style={{ fontFamily: F.body, fontSize: 13, color: C.amber, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Phone size={13} /> {delivery.agent.user.phone}
                </a>
              )}
              {delivery.agent.vehicleType && (
                <span style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 2, display: 'block' }}>Véhicule : {delivery.agent.vehicleType}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Distance info */}
      {delivery?.estimatedDistanceKm && (
        <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 20, border: `1px solid ${C.border}`, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
          <MapPin size={20} color={C.amber} />
          <div>
            <div style={{ fontFamily: F.heading, fontWeight: 700, color: C.forest }}>Distance estimée</div>
            <div style={{ fontFamily: F.body, fontSize: '1.1rem', fontWeight: 800, color: C.amber }}>{delivery.estimatedDistanceKm} km</div>
          </div>
        </div>
      )}
    </div>
  );
}
