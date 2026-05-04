'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CheckCircle, Truck, PackageCheck, Smartphone, MapPin, ArrowRight, MessageCircle, Printer } from 'lucide-react';
import { motion } from 'framer-motion';

const C = { 
  forest:'#064E3B', 
  emerald:'#10B981', 
  amber:'#D97706', 
  sand:'#F9FBF8', 
  glass:'rgba(255,255,255,0.72)', 
  border:'rgba(6,78,59,0.12)', 
  muted:'#64748B', 
  text:'#1F2937' 
};

const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}>{children}</div>
);

const StepItem = ({ icon, title, desc, isLast }: { icon: any; title: string; desc: string; isLast: boolean }) => (
  <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
    {!isLast && <div style={{ position: 'absolute', left: 15, top: 32, bottom: -12, width: 2, background: `linear-gradient(to bottom, ${C.emerald}, transparent)` }} />}
    <div style={{ width: 32, height: 32, borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.emerald, zIndex: 1, flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '0.9rem', color: C.forest }}>{title}</div>
      <div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted }}>{desc}</div>
    </div>
  </div>
);

function SuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  
  // ON RÉCUPÈRE UNIQUEMENT LA RÉALITÉ
  const orderId = searchParams?.get('orderId'); 
  const mode = searchParams?.get('mode');
  const hasCleared = useRef(false);

  useEffect(() => {
    if (!hasCleared.current) {
      clearCart();
      hasCleared.current = true;
    }
    window.scrollTo(0, 0);
  }, [clearCart]);

  // Lien WhatsApp dynamique : seulement si on a un ID, sinon message générique
  const whatsappMsg = orderId 
    ? `Bonjour, je souhaite suivre ma commande #${orderId}`
    : `Bonjour, je viens de passer une commande sur l'application Business.`;
  
  const whatsappLink = `https://wa.me/22601479800?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div style={{ background: C.sand, minHeight: '100vh', padding: '48px 20px' }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>

        {/* Icône de succès */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={40} color={C.emerald} />
        </motion.div>

        <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>
          {mode === 'offline' ? 'Commande enregistrée' : 'Commande confirmée'}
        </h1>
        
        <div style={{ marginBottom: 32 }}>
          {orderId ? (
            <div style={{ display: 'inline-block', padding: '8px 16px', background: 'white', borderRadius: 100, border: `1px solid ${C.border}`, fontWeight: 700, color: C.forest }}>
              Référence : #{orderId}
            </div>
          ) : (
            <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem' }}>
              {mode === 'offline' 
                ? "Votre commande est stockée sur votre téléphone et sera envoyée dès votre retour en ligne." 
                : "Nous avons bien reçu votre demande et préparons vos produits."}
            </p>
          )}
        </div>

        {/* Alerte Mode Offline */}
        {mode === 'offline' && (
          <div style={{ background: 'rgba(217,119,6,0.06)', border: `1px solid rgba(217,119,6,0.15)`, padding: 18, borderRadius: 20, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 28, textAlign: 'left' }}>
            <Smartphone size={22} color={C.amber} />
            <span style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.amber, fontWeight: 600 }}>
              Synchronisation automatique dès détection d'une connexion internet.
            </span>
          </div>
        )}

        {/* Étapes de livraison */}
        <GlassCard style={{ padding: 28, textAlign: 'left', marginBottom: 32 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '0.85rem', fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: C.forest, textTransform: 'uppercase' }}>
            <Truck size={18} /> Suivi logistique
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <StepItem icon={<PackageCheck size={16} />} title="Préparation" desc="Vérification de la qualité par le producteur." isLast={false} />
            <StepItem icon={<MapPin size={16} />} title="Livraison" desc="Le livreur se dirige vers votre point GPS." isLast={true} />
          </div>
        </GlassCard>

        {/* Actions (cachées à l'impression) */}
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/catalogue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: C.forest, color: 'white', padding: '18px', borderRadius: 100, textDecoration: 'none', fontWeight: 800 }}>
            Retour à la boutique <ArrowRight size={20} />
          </Link>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'white', border: `1px solid ${C.border}`, padding: '14px', borderRadius: 16, color: C.forest, fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={18} /> Imprimer
            </button>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: 'white', padding: '14px', borderRadius: 16, textDecoration: 'none', fontWeight: 700 }}>
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
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center', color: C.muted }}>Chargement...</div>}>
      <SuccessContent />
    </Suspense>
  );
}