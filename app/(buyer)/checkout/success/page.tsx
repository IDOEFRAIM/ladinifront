'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CheckCircle, Truck, PackageCheck, Smartphone, MapPin, ArrowRight, MessageCircle, Download, Edit2, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

const getItemStats = (item: any) => ({ name: item.name || item.productName || 'Article', quantity: item.quantity ?? item.qty ?? 1, price: item.price ? Number(item.price) : 0 });
const calculateOrderTotal = (items: any[]) => items.reduce((acc, it) => { const { quantity, price } = getItemStats(it); return acc + (price * quantity); }, 0);
const getWhatsAppLink = (phone: string, orderId: string, total: number) => { const c = phone.replace(/\D/g, ''); const n = c ? `226${c}` : '22601479800'; return `https://wa.me/${n}?text=${encodeURIComponent(`Bonjour, commande #${orderId}. Total: ${total.toLocaleString('fr-FR')} CFA. Tel: ${phone}`)}`; };

const StepItem = ({ icon, title, desc, isLast }: { icon: React.ReactNode; title: string; desc: string; isLast: boolean }) => (
  <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
    {!isLast && <div style={{ position: 'absolute', left: 15, top: 32, bottom: -12, width: 2, background: `linear-gradient(to bottom, ${C.emerald}, transparent)` }} />}
    <div style={{ width: 32, height: 32, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald, zIndex: 1, flexShrink: 0 }}>{icon}</div>
    <div><div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.9rem', color: C.forest }}>{title}</div><div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>{desc}</div></div>
  </div>
);

function useOrderLogic(cartItems: any[], clearCart: () => void, initialPhone: string) {
  const [state, setState] = useState({ orderId: '', phone: '', orderItems: [] as any[], isInitialized: false });
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('agri_last_order') || '{}');
    const storedPhone = localStorage.getItem('agri_customer_phone') || '';
    const finalId = stored.orderId || `AGRI-${Math.floor(Math.random() * 90000) + 10000}`;
    const finalItems = cartItems.length > 0 ? [...cartItems] : (stored.items || []);
    setState({ orderId: finalId, phone: initialPhone || storedPhone, orderItems: finalItems, isInitialized: true });
    if (cartItems.length > 0) { clearCart(); localStorage.removeItem('agri_last_order'); }
  }, []);
  const updatePhone = (p: string) => { localStorage.setItem('agri_customer_phone', p); setState(s => ({ ...s, phone: p })); };
  return { ...state, updatePhone };
}

function OrderSummary({ items }: { items: any[] }) {
  const total = useMemo(() => calculateOrderTotal(items), [items]);
  return (
    <GlassCard style={{ padding: 24, marginBottom: 20 }}>
      <h4 style={{ fontFamily: F.heading, fontWeight: 800, margin: '0 0 16px', fontSize: '0.95rem', color: C.forest }}>Resume de la commande</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((it, idx) => { const { name, quantity, price } = getItemStats(it); return (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.body, fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 700, flex: 1 }}>{name}</span>
            <span style={{ color: C.muted, width: 120, textAlign: 'right' as const }}>{quantity} x {price.toLocaleString()} F</span>
            <span style={{ fontWeight: 800, width: 100, textAlign: 'right' as const, color: C.forest }}>{(price * quantity).toLocaleString()} F</span>
          </div>
        ); })}
        <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '8px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: F.heading, fontWeight: 900, fontSize: '1.1rem', color: C.forest }}>
          <span>Total</span><span>{total.toLocaleString('fr-FR')} CFA</span>
        </div>
      </div>
    </GlassCard>
  );
}

function SuccessContent() {
  const { clearCart, items: cartItems } = useCart();
  const searchParams = useSearchParams();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const { orderId, phone, orderItems, updatePhone, isInitialized } = useOrderLogic(cartItems, clearCart, searchParams?.get('phone') || '');
  if (!isInitialized) return null;
  const mode = searchParams?.get('mode');
  const total = calculateOrderTotal(orderItems);

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '48px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' as const }}>
        {/* Success icon */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(16,185,129,0.12)' }}>
          <CheckCircle size={40} strokeWidth={2.5} color={C.emerald} />
        </motion.div>

        <h1 style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>
          {mode === 'offline' ? 'Commande Enregistree !' : 'Paiement Confirme !'}
        </h1>
        <p style={{ fontFamily: F.body, color: C.muted, marginBottom: 20 }}>Reference : <strong style={{ color: C.forest }}>#{orderId}</strong></p>

        {/* Phone badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.glass, backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, padding: '8px 18px', borderRadius: 100, marginBottom: 28 }}>
          <span style={{ fontFamily: F.body, fontSize: '0.8rem', fontWeight: 600, color: C.muted }}>Livreur appelle au :</span>
          {isEditingPhone ? (
            <input autoFocus defaultValue={phone} onBlur={(e) => { updatePhone(e.target.value); setIsEditingPhone(false); }} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', width: 120, fontFamily: F.body }} />
          ) : (
            <><span style={{ fontFamily: F.heading, fontWeight: 800 }}>{phone || 'Non renseigne'}</span><Edit2 size={14} onClick={() => setIsEditingPhone(true)} style={{ cursor: 'pointer', color: C.amber }} /></>
          )}
        </div>

        {mode === 'offline' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(217,119,6,0.06)', border: `1px solid rgba(217,119,6,0.15)`, padding: 16, borderRadius: 20, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24, textAlign: 'left' as const }}>
            <div style={{ background: C.amber, padding: 10, borderRadius: 14 }}><Smartphone size={22} color="white" /></div>
            <div><div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '0.85rem', color: C.amber }}>MODE HORS-LIGNE</div><div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>Synchronisation automatique des le retour du reseau.</div></div>
          </motion.div>
        )}

        {/* Delivery steps */}
        <GlassCard style={{ padding: 28, textAlign: 'left' as const, marginBottom: 24 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 800, color: C.forest, textTransform: 'uppercase' as const, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Truck size={18} color={C.emerald} /> Suivi de livraison
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <StepItem icon={<PackageCheck size={16} />} title="Validation" desc="Le producteur prepare vos produits." isLast={false} />
            <StepItem icon={<MapPin size={16} />} title="Expedition" desc="Le livreur se rend a votre position GPS." isLast={true} />
          </div>
        </GlassCard>

        <OrderSummary items={orderItems} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/market" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: 18, borderRadius: 100, textDecoration: 'none', fontFamily: F.body, fontWeight: 800 }}>
            Continuer mes achats <ArrowRight size={20} />
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.print()} style={{ flex: 1, background: C.glass, backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, padding: 14, borderRadius: 16, fontFamily: F.body, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.forest }}>
              <Download size={18} /> Recu
            </button>
            <a href={getWhatsAppLink(phone, orderId, total)} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: '#25D366', color: 'white', padding: 14, borderRadius: 16, textDecoration: 'none', fontFamily: F.body, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function OrderSuccessPage() { return <SuccessContent />; }
