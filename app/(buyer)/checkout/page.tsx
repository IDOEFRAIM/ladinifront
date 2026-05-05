'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import LastMileGuide from '@/components/geo/LastMileGuide';
import { queueOfflineOrder } from '@/lib/dexie';
import { 
  MapPin, User, Wallet, CheckCircle2, WifiOff, 
  ArrowLeft, AlertCircle, Loader2, ShieldCheck 
} from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { createOrderAction } from '@/app/actions/createOrderAction';

// Design System
const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.85)', 
  border:'rgba(6,78,59,0.08)', 
  muted:'#64748B', 
  text:'#1F2937', 
  error:'#EF4444' 
};

const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

// Composants Atomiques
const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ 
    background: C.glass, 
    backdropFilter: 'blur(12px)', 
    borderRadius: 24, 
    border: `1px solid ${C.border}`, 
    boxShadow: '0 4px 24px -2px rgba(0,0,0,0.02)',
    ...style 
  }}>{children}</div>
);

interface CheckoutFormData { name: string; phone: string; city: string; paymentMethod: string; }
interface GeoUpdateData { lat: number; lng: number; description: string; audioBlob?: Blob | null; }

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const isOnline = useNetwork();
  const { userLocation, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [geoData, setGeoData] = useState<GeoUpdateData | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutFormData>({
    defaultValues: { name: '', phone: '', city: 'Ouagadougou', paymentMethod: 'mobile_money' }
  });

  useEffect(() => { 
    setIsMounted(true); 
    // Redirection si panier vide (sauf si on est déjà en train de process)
    if (isMounted && items.length === 0 && !isProcessing) {
        router.push('/cart');
    }
    setValue('name', localStorage.getItem('agri_customer_name') || ''); 
    setValue('phone', localStorage.getItem('agri_customer_phone') || ''); 
  }, [items.length, isMounted, router, setValue]);

  const onSubmit: SubmitHandler<CheckoutFormData> = async (formData) => {
    if (isProcessing || isAuthLoading) return;

    // Fix: Capturer le total actuel pour éviter le 0 lors du clearCart éventuel
    const finalPrice = cartTotal;

    if (items.length === 0) {
      setGlobalError("Votre panier est vide.");
      return;
    }

    if (!geoData?.lat || !geoData?.lng) {
      setGlobalError("Localisation précise requise pour la livraison.");
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    if (!isAuthenticated) {
      return router.push(`/login?next=/checkout`);
    }

    setIsProcessing(true);
    setGlobalError('');

    try {
      const orderPayload = {
        customer: { name: formData.name.trim(), phone: formData.phone.trim() },
        delivery: { 
          lat: geoData.lat, 
          lng: geoData.lng, 
          description: geoData.description || "", 
          city: formData.city 
        },
        items: items.map(i => ({ id: i.id, qty: i.quantity, price: Number(i.price) })),
        totalAmount: finalPrice,
        paymentMethod: formData.paymentMethod,
        locationId: userLocation?.id
      };

      // Persistence locale pour confort utilisateur
      localStorage.setItem('agri_customer_name', formData.name);
      localStorage.setItem('agri_customer_phone', formData.phone);

      if (isOnline) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(orderPayload));
        if (geoData?.audioBlob) {
          fd.append('voiceNote', geoData.audioBlob, `voice_${Date.now()}.webm`);
        }

        const result = await createOrderAction(fd);
        if (result?.success) {
          // IMPORTANT: On ne fait PAS clearCart() ici pour éviter le saut à 0
          router.push(`/checkout/success?orderId=${result.orderId}&mode=live`);
        } else {
          throw new Error(result?.error || "Erreur lors de la création de la commande.");
        }
      } else {
        // Mode Offline
        await queueOfflineOrder({
          productIds: items.map(i => ({ productId: i.id, quantity: i.quantity })),
          totalAmount: finalPrice,
          customerName: formData.name,
          customerPhone: formData.phone,
          deliveryDesc: geoData.description || formData.city,
          voiceNoteBlob: geoData.audioBlob || null,
          gpsLat: geoData.lat,
          gpsLng: geoData.lng
        });
        router.push(`/checkout/success?mode=offline`);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Un problème technique empêche la commande.");
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  const inputStyle: React.CSSProperties = { 
    width: '100%', padding: '14px 16px', borderRadius: 14, 
    border: `1px solid ${C.border}`, background: 'white', 
    fontFamily: F.body, fontSize: '0.95rem', outline: 'none',
    transition: 'border-color 0.2s',
    cursor: isProcessing ? 'not-allowed' : 'text'
  };

  return (
    <div style={{ background: C.sand, color: C.text, minHeight: '100vh', padding: '24px 5%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        <header style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button 
                onClick={() => router.back()} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}
            >
                <ArrowLeft size={16} /> Retour
            </button>
            <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, margin: 0 }}>Finalisation</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
             <span style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Panier</span>
             <p style={{ fontWeight: 800, color: C.forest }}>{items.length} Article(s)</p>
          </div>
        </header>

        {globalError && (
          <div style={{ background: '#FEF2F2', color: C.error, padding: 16, borderRadius: 16, marginBottom: 24, border: `1px solid ${C.error}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          
          {/* COLONNE GAUCHE : INFOS & GEO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <User size={16} /> Informations Client
              </h2>
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: 6 }}>Nom & Prénom</label>
                  <input {...register('name', { required: true })} disabled={isProcessing} placeholder="Ex: Jean Traoré" style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: C.muted, marginBottom: 6 }}>Numéro Mobile (WhatsApp)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: C.forest, fontSize: '0.9rem' }}>+226</span>
                    <input type="tel" {...register('phone', { required: true, pattern: /^[0-9]{8}$/ })} disabled={isProcessing} placeholder="70000000" style={{ ...inputStyle, paddingLeft: 60, fontWeight: 800 }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                <MapPin size={16} /> Point de livraison
              </div>
              <LastMileGuide onChange={setGeoData} />
            </GlassCard>
          </div>

          {/* COLONNE DROITE : PAIEMENT & RÉCAP */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <Wallet size={16} /> Mode de Paiement
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                    { id: 'mobile_money', label: 'Mobile Money', desc: 'Orange Money ou Moov Money' }, 
                    { id: 'cash', label: 'Espèces', desc: 'Payer à la livraison' }
                ].map(opt => {
                  const active = watch('paymentMethod') === opt.id;
                  return (
                    <label key={opt.id} style={{ 
                        display: 'flex', alignItems: 'center', gap: 15, padding: 16, borderRadius: 16, 
                        border: active ? `2px solid ${C.emerald}` : `1px solid ${C.border}`, 
                        background: active ? `${C.emerald}08` : 'transparent', 
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s'
                    }}>
                      <input type="radio" value={opt.id} {...register('paymentMethod')} disabled={isProcessing} style={{ accentColor: C.emerald, width: 18, height: 18 }} />
                      <div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: active ? C.forest : C.text }}>{opt.label}</span>
                        <br/>
                        <span style={{ fontSize: '0.7rem', color: C.muted }}>{opt.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </GlassCard>

            <div style={{ 
                background: C.forest, color: 'white', padding: 32, borderRadius: 32, 
                position: 'sticky', top: 24, boxShadow: `0 20px 40px -12px ${C.forest}40` 
            }}>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 600 }}>Montant Total</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: '2.4rem', fontWeight: 900 }}>{cartTotal.toLocaleString()}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, opacity: 0.8 }}>CFA</span>
                </div>
              </div>

              <div style={{ 
                fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', 
                padding: '12px 16px', borderRadius: 14, marginBottom: 28, 
                display: 'flex', alignItems: 'center', gap: 10,
                color: isOnline ? '#A7F3D0' : '#FDE68A' 
              }}>
                {isOnline ? <CheckCircle2 size={16} /> : <WifiOff size={16} />}
                <span style={{ fontWeight: 600 }}>{isOnline ? 'Serveur prêt' : 'Mode hors-ligne (synchro auto)'}</span>
              </div>

              <button 
                type="submit" 
                disabled={isProcessing} 
                style={{ 
                    width: '100%', padding: '20px', 
                    background: isProcessing ? C.muted : `linear-gradient(135deg, ${C.amber}, #F59E0B)`, 
                    color: 'white', border: 'none', borderRadius: 20, 
                    fontWeight: 900, fontSize: '1rem', cursor: isProcessing ? 'not-allowed' : 'pointer', 
                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
                    boxShadow: isProcessing ? 'none' : '0 10px 20px -5px rgba(217,119,6,0.4)',
                    transition: 'transform 0.2s, filter 0.2s'
                }}
                onMouseEnter={(e) => !isProcessing && (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => !isProcessing && (e.currentTarget.style.filter = 'brightness(1)')}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>Confirmer la commande</span>
                  </>
                )}
              </button>
              
              <p style={{ textAlign: 'center', fontSize: '0.65rem', opacity: 0.5, marginTop: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Paiement sécurisé par AgriConnect
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}