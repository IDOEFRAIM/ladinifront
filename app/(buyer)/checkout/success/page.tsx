'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CheckCircle, Truck, PackageCheck, Smartphone, MapPin, ArrowRight, MessageCircle, Printer, Edit2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.85)', border:'rgba(6,78,59,0.12)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

// --- LOGIQUE DE PERSISTANCE ---
function useOrderLogic(cartItems: any[], clearCart: () => void, initialPhone: string) {
  const [state, setState] = useState({ orderId: '', phone: '', orderItems: [] as any[], isInitialized: false });

  useEffect(() => {
    // 1. Récupérer l'ID depuis l'URL ou générer
    const searchParams = new URLSearchParams(window.location.search);
    const orderIdFromUrl = searchParams.get('orderId');
    
    // 2. Tenter de récupérer les données de la dernière commande
    const storedOrder = JSON.parse(sessionStorage.getItem('last_processed_order') || 'null');
    
    let finalItems = [];
    let finalId = orderIdFromUrl || `AGRI-${Math.floor(Math.random() * 90000) + 10000}`;

    if (cartItems.length > 0) {
      // Premier chargement après checkout
      finalItems = [...cartItems];
      sessionStorage.setItem('last_processed_order', JSON.stringify({ id: finalId, items: finalItems }));
      clearCart();
    } else if (storedOrder) {
      // Rechargement de la page (F5)
      finalItems = storedOrder.items;
      finalId = storedOrder.id;
    }

    const finalPhone = initialPhone || localStorage.getItem('agri_customer_phone') || '';
    
    setState({ orderId: finalId, phone: finalPhone, orderItems: finalItems, isInitialized: true });
  }, []);

  const updatePhone = (p: string) => {
    localStorage.setItem('agri_customer_phone', p);
    setState(s => ({ ...s, phone: p }));
  };

  return { ...state, updatePhone };
}

// --- COMPOSANT RÉSUMÉ STYLE TICKET ---
function OrderSummary({ items }: { items: any[] }) {
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (Number(it.price) * (it.quantity || it.qty || 1)), 0), [items]);
  
  return (
    <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 24, border: `1px dashed ${C.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <div style={{ textAlign: 'center', marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
        <span style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Détails de facturation</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.body, fontWeight: 700, fontSize: '0.9rem', color: C.text }}>{it.name || it.productName}</div>
              <div style={{ fontSize: '0.75rem', color: C.muted }}>Qté: {it.quantity || it.qty}</div>
            </div>
            <div style={{ fontFamily: F.body, fontWeight: 800, color: C.forest }}>
              {((Number(it.price)) * (it.quantity || it.qty)).toLocaleString()} F
            </div>
          </div>
        ))}
        
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: `2px solid ${C.sand}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: C.muted }}>
            <span>Sous-total</span>
            <span>{subtotal.toLocaleString()} F</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontFamily: F.heading, fontWeight: 900, color: C.forest }}>
            <span>TOTAL À PAYER</span>
            <span>{subtotal.toLocaleString()} CFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { clearCart, items: cartItems } = useCart();
  const searchParams = useSearchParams();
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const { orderId, phone, orderItems, updatePhone, isInitialized } = useOrderLogic(cartItems, clearCart, searchParams?.get('phone') || '');

  if (!isInitialized) return null;

  const mode = searchParams?.get('mode');
  const whatsappMsg = `Bonjour AgriBusiness, j'ai passé la commande #${orderId}. Merci de me confirmer la livraison au ${phone}.`;
  const whatsappLink = `https://wa.me/22601479800?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '40px 20px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 500, margin: '0 auto' }}>
        
        {/* Header Success */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} style={{ width: 70, height: 70, background: C.emerald, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'white', boxShadow: `0 10px 20px -5px ${C.emerald}66` }}>
            <CheckCircle size={36} />
          </motion.div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.75rem', fontWeight: 900, color: C.forest, marginBottom: 8 }}>
            {mode === 'offline' ? 'Commande en attente' : 'Merci pour votre commande !'}
          </h1>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'white', borderRadius: 100, border: `1px solid ${C.border}`, fontSize: '0.9rem', fontWeight: 700, color: C.muted }}>
            Réf: <span style={{ color: C.emerald }}>#{orderId}</span>
          </div>
        </div>

        {/* Status Mode Offline */}
        {mode === 'offline' && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', padding: 16, borderRadius: 16, marginBottom: 24, display: 'flex', gap: 12 }}>
            <Smartphone size={24} color={C.amber} />
            <p style={{ fontSize: '0.85rem', color: '#9A3412', margin: 0, fontFamily: F.body }}>
              <strong>Mode Hors-ligne :</strong> Votre commande est enregistrée localement. Elle sera envoyée dès que votre connexion internet sera rétablie.
            </p>
          </div>
        )}

        {/* Info Contact */}
        <div style={{ background: 'white', padding: 16, borderRadius: 20, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: `${C.emerald}10`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald }}>
              <Truck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 600 }}>Contact Livraison</div>
              <div style={{ fontWeight: 800, color: C.forest }}>{phone || 'Non renseigné'}</div>
            </div>
          </div>
          <button onClick={() => setIsEditingPhone(!isEditingPhone)} style={{ border: 'none', background: `${C.amber}15`, color: C.amber, padding: 8, borderRadius: 10, cursor: 'pointer' }}>
            <Edit2 size={16} />
          </button>
        </div>

        {isEditingPhone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginBottom: 20 }}>
            <input 
              autoFocus 
              placeholder="Nouveau numéro"
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingPhone(false)}
              onChange={(e) => updatePhone(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: `2px solid ${C.emerald}`, outline: 'none' }}
            />
          </motion.div>
        )}

        <OrderSummary items={orderItems} />

        {/* Timeline simple */}
        <div style={{ marginBottom: 32, padding: '0 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 0 4px ${C.emerald}22` }} />
            <span style={{ fontSize: '0.9rem', color: C.text, fontWeight: 600 }}>Commande reçue et en cours de préparation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15, opacity: 0.5 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.muted }} />
            <span style={{ fontSize: '0.9rem', color: C.text }}>Expédition vers votre position GPS</span>
          </div>
        </div>

        {/* Buttons d'action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#25D366', color: 'white', padding: '18px', borderRadius: 16, textDecoration: 'none', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 12px rgba(37,211,102,0.25)' }}>
            <MessageCircle size={22} /> Contacter le livreur (WhatsApp)
          </a>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'white', border: `1px solid ${C.border}`, padding: '14px', borderRadius: 16, color: C.forest, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={18} /> Imprimer
            </button>
            <Link href="/catalogue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.forest, color: 'white', padding: '14px', borderRadius: 16, textDecoration: 'none', fontWeight: 700 }}>
              <ArrowRight size={18} /> Boutique
            </Link>
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.8rem', color: C.forest }}>
          <ShieldCheck size={14} /> Paiement et données sécurisés par AgriBusiness
        </div>

      </motion.div>
    </div>
  );
}