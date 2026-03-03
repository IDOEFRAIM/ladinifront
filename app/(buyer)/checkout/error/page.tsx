'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CheckCircle, Truck, PackageCheck, Smartphone, MapPin, ArrowRight, MessageCircle, Download, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

const StepItem = ({ icon, title, desc, isLast }: { icon: any; title: string; desc: string; isLast: boolean }) => (
  <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
    {!isLast && <div style={{ position: 'absolute', left: 15, top: 32, bottom: -12, width: 2, background: `linear-gradient(to bottom, ${C.emerald}, transparent)` }} />}
    <div style={{ width: 32, height: 32, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald, zIndex: 1, flexShrink: 0 }}>{icon}</div>
    <div><div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.9rem', color: C.forest }}>{title}</div><div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>{desc}</div></div>
  </div>
);

function SuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const [orderId, setOrderId] = useState<string | null>(null);
  const hasCleared = useRef(false);

  useEffect(() => {
    setOrderId(`AGRI-${Math.floor(Math.random() * 90000) + 10000}`);
    if (!hasCleared.current) { clearCart(); hasCleared.current = true; }
    window.scrollTo(0, 0);
  }, [clearCart]);

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '48px 20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' as const }}>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} style={{ width: 88, height: 88, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 10px 30px rgba(16,185,129,0.12)' }}>
          <CheckCircle size={44} strokeWidth={2.5} color={C.emerald} />
        </motion.div>

        <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12, letterSpacing: '-0.02em' }}>
          {mode === 'offline' ? 'Commande Enregistree !' : 'Paiement Confirme !'}
        </h1>
        <p style={{ fontFamily: F.body, color: C.muted, fontSize: '1rem', marginBottom: 32, lineHeight: 1.5 }}>
          Votre commande <strong style={{ color: C.forest }}>#{orderId || '...'}</strong> a ete transmise.
          {mode === 'offline' ? " Elle sera synchronisee des votre retour en ligne." : " Nous preparons vos produits."}
        </p>

        {mode === 'offline' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: 'rgba(217,119,6,0.06)', border: `1px solid rgba(217,119,6,0.15)`, padding: 20, borderRadius: 20, display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, textAlign: 'left' as const }}>
            <div style={{ background: C.amber, padding: 12, borderRadius: 14 }}><Smartphone size={24} color="white" /></div>
            <div><div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '0.9rem', color: C.amber, textTransform: 'uppercase' as const }}>Mode Sans Connexion</div><div style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.muted }}>Votre commande est sauvegardee localement.</div></div>
          </motion.div>
        )}

        <GlassCard style={{ padding: 28, textAlign: 'left' as const, marginBottom: 32 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '0.9rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase' as const }}>
            <Truck size={20} color={C.emerald} /> Prochaines Etapes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepItem icon={<PackageCheck size={16} />} title="Preparation Fraicheur" desc="Le producteur emballe vos produits ce matin." isLast={false} />
            <StepItem icon={<MapPin size={16} />} title="Livraison Geo-guidee" desc="Le livreur utilisera vos coordonnees GPS exactes." isLast={true} />
          </div>
        </GlassCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Link href="/catalogue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: 20, borderRadius: 100, textDecoration: 'none', fontFamily: F.body, fontWeight: 800, fontSize: '1rem' }}>
            Continuer mes achats <ArrowRight size={20} />
          </Link>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.print()} style={{ flex: 1, background: C.glass, backdropFilter: 'blur(12px)', border: `1px solid ${C.border}`, padding: 16, borderRadius: 16, fontFamily: F.body, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.forest }}>
              <Download size={18} /> Recu PDF
            </button>
            <a href={`https://wa.me/226XXXXXXXX?text=Bonjour, suivi commande ${orderId}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, background: '#25D366', color: 'white', padding: 16, borderRadius: 16, textDecoration: 'none', fontFamily: F.body, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center' as const, fontFamily: "'Inter', sans-serif", color: '#64748B' }}>Verification de la commande...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
