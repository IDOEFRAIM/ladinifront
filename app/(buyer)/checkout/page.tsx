'use client';

import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useCart, CartItem } from '@/context/CartContext';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import LastMileGuide from '@/components/geo/LastMileGuide';
import { queueOfflineOrder } from '@/lib/dexie';
import { MapPin, Phone, User, Wallet, CheckCircle2, WifiOff, ArrowLeft, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937', error:'#EF4444', success:'#10B981' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

interface CheckoutFormData { name: string; phone: string; city: string; paymentMethod: string; }
interface GeoUpdateData { lat: number; lng: number; description: string; audioBlob?: Blob | null; }

const validateAvailability = async (items: CartItem[]) => {
  const results = await Promise.all(items.map(async (item) => { if (!item.id) return null; try { await axios.head(`/api/publicProduct/${item.id}`); return item; } catch { return null; } }));
  const filtered = results.filter((i): i is CartItem => i !== null);
  if (filtered.length === 0) throw new Error('Produits indisponibles.');
  if (filtered.length !== items.length) throw new Error("Certains articles ne sont plus disponibles.");
  return filtered;
};

interface OrderMetadataParams { data: CheckoutFormData; items: CartItem[]; total: number; geo: GeoUpdateData | null; locationId?: string; }
const formatOrderMetadata = ({ data, items, total, geo, locationId }: OrderMetadataParams) => ({
  customer: { name: data.name, phone: data.phone },
  delivery: { lat: geo?.lat || null, lng: geo?.lng || null, description: geo?.description || "", city: data.city },
  totalAmount: total, paymentMethod: data.paymentMethod, locationId,
  items: items.map(i => ({ id: i.id, qty: i.quantity, price: Number(i.price) }))
});

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const isOnline = useNetwork();
  const { userLocation } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [geoData, setGeoData] = useState<GeoUpdateData | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutFormData>({
    defaultValues: { name: '', phone: '', city: 'Ouagadougou', paymentMethod: 'mobile_money' }
  });

  useEffect(() => { setIsMounted(true); setValue('name', localStorage.getItem('agri_customer_name') || ''); setValue('phone', localStorage.getItem('agri_customer_phone') || ''); }, [setValue]);

  const processOnlineOrder = async (metadata: any, items: CartItem[], data: CheckoutFormData) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(metadata));
    if (geoData?.audioBlob) formData.append('voiceNote', geoData.audioBlob, `audio_${Date.now()}.webm`);
    const { data: result } = await axios.post('/api/orders', formData);
    localStorage.setItem('agri_customer_name', data.name);
    localStorage.setItem('agri_customer_phone', data.phone);
    localStorage.setItem('agri_last_order', JSON.stringify({ orderId: result?.orderId, items, total: cartTotal, customer: metadata.customer, delivery: metadata.delivery }));
    clearCart();
    router.push(`/checkout/success?mode=live&orderId=${result?.orderId || ''}`);
  };

  const processOfflineOrder = async (data: CheckoutFormData, items: CartItem[]) => {
    await queueOfflineOrder({ productIds: items.map(i => ({ productId: i.id, quantity: i.quantity })), totalAmount: cartTotal, customerName: data.name, customerPhone: data.phone, deliveryDesc: geoData?.description || data.city || '', voiceNoteBlob: geoData?.audioBlob || null, gpsLat: geoData?.lat, gpsLng: geoData?.lng });
    clearCart();
    router.push(`/checkout/success?mode=offline`);
  };

  const onSubmit: SubmitHandler<CheckoutFormData> = async (formData) => {
    setIsProcessing(true); setGlobalError('');
    try {
      const activeItems = isOnline ? await validateAvailability(items) : items;
      const metadata = formatOrderMetadata({ data: formData, items: activeItems, total: cartTotal, geo: geoData, locationId: userLocation?.id });
      if (isOnline) await processOnlineOrder(metadata, activeItems, formData);
      else await processOfflineOrder(formData, activeItems);
    } catch (err: any) { setGlobalError(err.message || "Erreur lors de la validation."); }
    finally { setIsProcessing(false); }
  };

  if (!isMounted) return null;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '14px 16px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.sand, fontFamily: F.body, fontSize: '0.95rem', outline: 'none' };

  return (
    <div style={{ background: C.sand, color: C.text, minHeight: '100vh', padding: '24px 5%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 8, fontFamily: F.body, fontWeight: 600, fontSize: '0.9rem', marginBottom: 12 }}>
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest }}>Finaliser la commande</h1>
        </motion.header>

        {globalError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(239,68,68,0.06)', color: C.error, padding: 16, borderRadius: 16, marginBottom: 24, border: `1px solid rgba(239,68,68,0.15)`, display: 'flex', alignItems: 'center', gap: 12, fontFamily: F.body }}>
            <AlertCircle size={22} /><span style={{ fontWeight: 600 }}>{globalError}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* User info */}
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.heading, fontSize: '0.85rem', color: C.forest, textTransform: 'uppercase' as const, marginBottom: 24, fontWeight: 800, letterSpacing: 0.5 }}>
                <User size={18} /> Vos Informations
              </h2>
              <div style={{ display: 'grid', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: F.body, fontSize: '0.8rem', fontWeight: 700, color: C.muted, marginBottom: 8 }}>Nom Complet</label>
                  <input {...register('name', { required: true })} style={inputStyle} />
                  {errors.name && <p style={{ color: C.error, fontSize: '0.75rem', marginTop: 4, fontFamily: F.body }}>Champ requis</p>}
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: F.body, fontSize: '0.8rem', fontWeight: 700, color: C.muted, marginBottom: 8 }}>Mobile</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: C.forest, fontFamily: F.body }}>+226</span>
                    <input type="tel" {...register('phone', { required: true, pattern: /^[0-9]{8}$/ })} style={{ ...inputStyle, paddingLeft: 65, fontWeight: 800, fontSize: '1.1rem' }} />
                  </div>
                  {errors.phone && <p style={{ color: C.error, fontSize: '0.75rem', marginTop: 4, fontFamily: F.body }}>Numéro invalide (8 chiffres)</p>}
                </div>
              </div>
            </GlassCard>

            {/* Delivery / GPS */}
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, fontWeight: 800, fontFamily: F.heading, fontSize: '0.85rem', textTransform: 'uppercase' as const }}>
                <MapPin size={18} /> Précision Livraison
              </div>
              <LastMileGuide onChange={setGeoData} />
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Payment */}
            <GlassCard style={{ padding: 28 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.heading, fontSize: '0.85rem', color: C.forest, textTransform: 'uppercase' as const, marginBottom: 24, fontWeight: 800 }}>
                <Wallet size={18} /> Paiement
              </h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[{ id: 'mobile_money', label: 'Mobile Money', desc: 'Paiement a la livraison', emoji: '' }, { id: 'cash', label: 'Especes', desc: 'Main a main', emoji: '' }].map(opt => {
                  const active = watch('paymentMethod') === opt.id;
                  return (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: 18, borderRadius: 18, border: active ? `2px solid ${C.emerald}` : `1px solid ${C.border}`, background: active ? 'rgba(16,185,129,0.04)' : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" value={opt.id} {...register('paymentMethod')} style={{ accentColor: C.emerald }} />
                      <div><span style={{ fontWeight: 800, fontFamily: F.body }}>{opt.emoji} {opt.label}</span><br/><span style={{ fontSize: '0.75rem', color: C.muted, fontFamily: F.body }}>{opt.desc}</span></div>
                    </label>
                  );
                })}
              </div>
            </GlassCard>

            {/* Summary */}
            <div style={{ background: C.forest, color: 'white', padding: 32, borderRadius: 28, position: 'sticky' as const, top: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                  <span style={{ fontFamily: F.body, fontSize: '0.8rem', opacity: 0.6 }}>Total a payer</span><br/>
                  <span style={{ fontFamily: F.body, fontSize: '0.7rem', color: C.emerald }}>TVA incluse</span>
                </div>
                <span style={{ fontFamily: F.heading, fontWeight: 900, fontSize: '2rem' }}>{cartTotal.toLocaleString()} <small style={{ fontSize: '0.7rem' }}>CFA</small></span>
              </div>

              <div style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.08)', padding: 14, borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, color: isOnline ? C.emerald : C.amber }}>
                {isOnline ? <CheckCircle2 size={18} /> : <WifiOff size={18} />}
                <span style={{ fontFamily: F.body }}>{isOnline ? 'Connexion etablie' : 'Mode Offline active'}</span>
              </div>

              <button type="submit" disabled={isProcessing} style={{ width: '100%', padding: '18px', background: isProcessing ? C.muted : `linear-gradient(135deg, ${C.amber}, #F59E0B)`, color: 'white', border: 'none', borderRadius: 100, fontFamily: F.body, fontSize: '1rem', fontWeight: 800, cursor: isProcessing ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Confirmer ma commande</>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
