'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import LastMileGuide from '@/components/geo/LastMileGuide';
import { queueOfflineOrder } from '@/lib/dexie';
import { MapPin, User, Wallet, CheckCircle2, WifiOff, ArrowLeft, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion } from 'framer-motion';
import { createOrderAction } from '@/app/actions/createOrderAction';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937', error:'#EF4444' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
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
    setValue('name', localStorage.getItem('agri_customer_name') || ''); 
    setValue('phone', localStorage.getItem('agri_customer_phone') || ''); 
  }, [setValue]);

  const onSubmit: SubmitHandler<CheckoutFormData> = async (formData) => {
    // 1. Sécurité : Empêcher le double clic
    if (isProcessing || isAuthLoading) return;

    // 2. Sécurité : Vérifier que le panier n'est pas vide
    if (items.length === 0 || cartTotal <= 0) {
      setGlobalError("Votre panier est vide. Ajoutez des produits avant de commander.");
      return;
    }

    // 3. Sécurité : Vérifier que la localisation GPS est présente
    // Sans lat/lng, le livreur ne pourra jamais trouver le client
    if (!geoData?.lat || !geoData?.lng) {
      setGlobalError("Localisation requise : Veuillez cliquer sur 'Ma Position' ou pointer la carte.");
      // On scrolle doucement vers la carte pour aider l'utilisateur
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    // 4. Sécurité : Vérifier l'authentification
    if (!isAuthenticated) {
      setGlobalError('Veuillez vous connecter pour finaliser votre commande.');
      return router.push('/login');
    }

    setIsProcessing(true);
    setGlobalError('');

    try {
      // Préparation des métadonnées (Structure propre)
      const metadata = {
        customer: { 
          name: formData.name.trim(), 
          phone: formData.phone.trim() 
        },
        delivery: { 
          lat: geoData.lat, 
          lng: geoData.lng, 
          description: geoData.description || "", 
          city: formData.city 
        },
        items: items.map(i => ({ 
          id: i.id, 
          qty: i.quantity, 
          price: Number(i.price) 
        })),
        totalAmount: cartTotal,
        paymentMethod: formData.paymentMethod,
        locationId: userLocation?.id
      };

      // Sauvegarde locale pour la prochaine fois
      localStorage.setItem('agri_customer_name', formData.name);
      localStorage.setItem('agri_customer_phone', formData.phone);

      if (isOnline) {
        // --- MODE EN LIGNE ---
        const fd = new FormData();
        fd.append('data', JSON.stringify(metadata));
        
        // Ajout de la note vocale si elle existe
        if (geoData?.audioBlob) {
          fd.append('voiceNote', geoData.audioBlob, `order_voice_${Date.now()}.webm`);
        }

        const result = await createOrderAction(fd);

        if (result?.success && result.orderId) {
          clearCart();
          // On passe l'ID réel à la page succès
          router.push(`/checkout/success?orderId=${result.orderId}&mode=live`);
        } else {
          throw new Error(result?.error || "Le serveur a refusé la commande.");
        }
      } else {
        // --- MODE HORS-LIGNE (Dexie) ---
        await queueOfflineOrder({
          productIds: items.map(i => ({ productId: i.id, quantity: i.quantity })),
          totalAmount: cartTotal,
          customerName: formData.name,
          customerPhone: formData.phone,
          deliveryDesc: geoData.description || formData.city,
          voiceNoteBlob: geoData.audioBlob || null,
          gpsLat: geoData.lat,
          gpsLng: geoData.lng
        });

        clearCart();
        // Pas d'orderId ici car le serveur ne l'a pas encore reçue
        router.push(`/checkout/success?mode=offline`);
      }
    } catch (err: any) {
      console.error("Checkout Error:", err);
      setGlobalError(err.message || "Une erreur technique est survenue.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.sand, fontFamily: F.body, fontSize: '0.95rem', outline: 'none' };

  return (
    <div style={{ background: C.sand, color: C.text, minHeight: '100vh', padding: '24px 5%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest }}>Finaliser la commande</h1>
        </header>

        {globalError && (
          <div style={{ background: 'rgba(239,68,68,0.06)', color: C.error, padding: 16, borderRadius: 16, marginBottom: 24, border: `1px solid rgba(239,68,68,0.15)`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={22} /><span style={{ fontWeight: 600 }}>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.85rem' }}>
                <User size={18} /> Vos Informations
              </h2>
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.muted, marginBottom: 8 }}>Nom Complet</label>
                  <input {...register('name', { required: "Nom requis" })} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.muted, marginBottom: 8 }}>Mobile</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: C.forest }}>+226</span>
                    <input type="tel" {...register('phone', { required: "Mobile requis", pattern: /^[0-9]{8}$/ })} style={{ ...inputStyle, paddingLeft: 65, fontWeight: 800 }} />
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                <MapPin size={18} /> Précision Livraison
              </div>
              <LastMileGuide onChange={setGeoData} />
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase', marginBottom: 24, fontWeight: 800, fontSize: '0.85rem' }}>
                <Wallet size={18} /> Paiement
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[{ id: 'mobile_money', label: 'Mobile Money', desc: 'Paiement à la livraison' }, { id: 'cash', label: 'Espèces', desc: 'Main à main' }].map(opt => {
                  const active = watch('paymentMethod') === opt.id;
                  return (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 18, borderRadius: 18, border: active ? `2px solid ${C.emerald}` : `1px solid ${C.border}`, background: active ? 'rgba(16,185,129,0.04)' : 'transparent', cursor: 'pointer' }}>
                      <input type="radio" value={opt.id} {...register('paymentMethod')} style={{ accentColor: C.emerald }} />
                      <div><span style={{ fontWeight: 800 }}>{opt.label}</span><br/><span style={{ fontSize: '0.75rem', color: C.muted }}>{opt.desc}</span></div>
                    </label>
                  );
                })}
              </div>
            </GlassCard>

            <div style={{ background: C.forest, color: 'white', padding: 32, borderRadius: 28, position: 'sticky', top: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Total à payer</span><br/>
                  <span style={{ fontSize: '2rem', fontWeight: 900 }}>{cartTotal.toLocaleString()} <small style={{ fontSize: '0.7rem' }}>CFA</small></span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.08)', padding: 14, borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: isOnline ? C.emerald : C.amber }}>
                {isOnline ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
                <span>{isOnline ? 'Connexion établie' : 'Mode Hors-ligne activé'}</span>
              </div>

              <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '18px', background: isProcessing ? C.muted : `linear-gradient(135deg, ${C.amber}, #F59E0B)`, color: 'white', border: 'none', borderRadius: 100, fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Confirmer ma commande</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}