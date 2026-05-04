'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Truck, Clock, CheckCircle2, Package, MapPin, Phone, User,
  Loader2, ArrowLeft, RefreshCw, ShieldCheck, AlertTriangle, Copy, Check,
  ChefHat, UserCheck, Smartphone
} from 'lucide-react';

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
  return new Date(ts).toLocaleString('fr-FR', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (!orderId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/buyer/tracking/${orderId}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Commande introuvable' : 'Erreur de chargement');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  // Auto-refresh toutes les 30 secondes pour le temps réel
  useEffect(() => {
    if (!orderId || data?.order?.status === 'DELIVERED') return;
    const interval = setInterval(() => fetchTracking(true), 30000);
    return () => clearInterval(interval);
  }, [orderId, fetchTracking, data?.order?.status]);

  const copyOTP = () => {
    if (data?.delivery?.deliveryCode) {
      navigator.clipboard.writeText(data.delivery.deliveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 16 }}>
      <Loader2 size={32} style={{ color: C.emerald }} className="animate-spin" />
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14, fontWeight: 500 }}>Localisation de votre commande...</p>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 400, margin: '80px auto', textAlign: 'center', padding: 32, background: '#fff', borderRadius: 24, border: `1px solid ${C.border}` }}>
      <AlertTriangle size={48} color={C.red} style={{ marginBottom: 16, opacity: 0.8 }} />
      <h2 style={{ fontFamily: F.heading, color: C.forest, marginBottom: 8 }}>Oups !</h2>
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: 14, marginBottom: 24 }}>{error}</p>
      <button onClick={() => router.push('/buyer-dashboard')} style={{ width: '100%', padding: '12px', borderRadius: 12, background: C.forest, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
        Retour à mes commandes
      </button>
    </div>
  );

  const { order, delivery, timeline, isFailed, items } = data || {};

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 20px 60px' }}>
      
      {/* Header Mobile-First */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 14, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
          <ArrowLeft size={20} color={C.forest} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <h1 style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 800, color: C.forest, margin: 0 }}>Suivi Live</h1>
             {refreshing && <Loader2 size={12} className="animate-spin" color={C.emerald} />}
          </div>
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.muted, fontWeight: 600 }}>REF #{orderId?.substring(0, 8).toUpperCase()}</span>
        </div>
        <button onClick={() => fetchTracking(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 100, border: `1px solid ${C.border}`, background: refreshing ? C.sand : '#fff', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.forest }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? '...' : 'Actualiser'}
        </button>
      </div>

      {/* OTP / Security Card */}
      {delivery?.deliveryCode && order?.status !== 'DELIVERED' && !isFailed && (
        <div style={{ background: `linear-gradient(135deg, ${C.forest} 0%, #065F46 100%)`, borderRadius: 24, padding: 24, marginBottom: 24, boxShadow: '0 10px 25px rgba(6, 78, 59, 0.15)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
            <ShieldCheck size={120} color="#fff" />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: 100 }}>
                <ShieldCheck size={14} color={C.emerald} />
                <span style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>Sécurité Livraison</span>
              </div>
              <button onClick={copyOTP} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 600 }}>
                {copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}
              </button>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2.5rem', fontWeight: 800, letterSpacing: 8, color: '#fff', textAlign: 'center', margin: '10px 0' }}>
              {delivery.deliveryCode}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center', maxWidth: 280, margin: '0 auto' }}>
              Ne partagez ce code qu'avec le livreur une fois vos produits vérifiés.
            </p>
          </div>
        </div>
      )}

      {/* Stepper Vertical (Plus lisible sur Mobile) ou Horizontal */}
      <div style={{ background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color={C.emerald} /> État d'avancement
        </h3>

        {isFailed ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: C.red }}>
            <AlertTriangle size={42} style={{ marginBottom: 12 }} />
            <p style={{ fontWeight: 800, fontSize: 16 }}>Livraison interrompue</p>
            <p style={{ fontSize: 13, opacity: 0.8 }}>Un agent va vous contacter pour résoudre le problème.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
            {timeline?.map((step: any, i: number) => {
              const Icon = STEP_ICONS[step.step] || Package;
              const isReached = step.reached;
              return (
                <div key={step.step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  {/* Line connector */}
                  {i < timeline.length - 1 && (
                    <div style={{ position: 'absolute', top: 18, left: '50%', width: '100%', height: 2, background: timeline[i+1].reached ? C.emerald : C.border, zIndex: -1 }} />
                  )}
                  {/* Circle */}
                  <div style={{ 
                    width: 36, height: 36, borderRadius: '50%', background: isReached ? C.emerald : '#fff', 
                    border: `2px solid ${isReached ? C.emerald : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isReached ? '0 0 15px rgba(16, 185, 129, 0.2)' : 'none', transition: 'all 0.4s ease'
                  }}>
                    <Icon size={16} color={isReached ? '#fff' : C.muted} />
                  </div>
                  {/* Label */}
                  <div style={{ marginTop: 10, textAlign: 'center' }}>
                    <div style={{ fontFamily: F.body, fontSize: 10, fontWeight: 800, color: isReached ? C.forest : C.muted, lineHeight: 1.2 }}>{step.label}</div>
                    {step.timestamp && (
                      <div style={{ fontSize: 8, color: C.muted, marginTop: 2, fontWeight: 500 }}>{formatTime(step.timestamp).split(',')[1]}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rider & Vehicle Info */}
      {delivery?.agent && (
        <div style={{ background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: C.sand, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <UserCheck size={28} color={C.forest} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Votre Livreur</div>
            <div style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.forest }}>{delivery.agent.user?.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
               <span style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                 <Truck size={14} /> {delivery.agent.vehicleType || 'Coursier'}
               </span>
               {delivery.estimatedDistanceKm && (
                 <span style={{ fontSize: 12, color: C.amber, fontWeight: 700 }}>• {delivery.estimatedDistanceKm} km restants</span>
               )}
            </div>
          </div>
          {delivery.agent.user?.phone && (
            <a href={`tel:${delivery.agent.user.phone}`} style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald, transition: 'transform 0.2s' }}>
              <Phone size={20} fill="currentColor" />
            </a>
          )}
        </div>
      )}

      {/* Recap Articles */}
      <div style={{ background: C.glass, backdropFilter: 'blur(10px)', borderRadius: 24, border: `1px solid ${C.border}`, padding: 20 }}>
        <button 
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'default' }}
        >
          <span style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 800, color: C.forest }}>Contenu du colis</span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{items?.length} articles</span>
        </button>
        
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items?.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.emerald }} />
                <span style={{ fontFamily: F.body, fontSize: 14, color: C.text }}>
                  <span style={{ fontWeight: 700 }}>{item.quantity}x</span> {item.product?.name}
                </span>
              </div>
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.muted }}>
                {(item.quantity * item.priceAtSale).toLocaleString()} CFA
              </span>
            </div>
          ))}
          
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: F.heading, fontWeight: 800, color: C.forest }}>Total réglé</span>
            <span style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 900, color: C.emerald }}>
              {Number(order?.totalAmount).toLocaleString()} <small style={{ fontSize: 12 }}>CFA</small>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}