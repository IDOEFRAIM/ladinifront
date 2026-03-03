import React from 'react';
import Link from 'next/link';
import { WifiOff, ShoppingCart, History, BookOpen, ArrowLeft } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

export const metadata = { title: 'Hors Connexion | FrontAg' };

export default function OfflinePage() {
    return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:C.sand, padding:24, textAlign:'center', fontFamily:F.body }}>
            <div style={{ width:80, height:80, borderRadius:24, background:`${C.amber}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
                <WifiOff size={36} color="#D97706" />
            </div>
            <h1 style={{ fontSize:'2rem', color:C.text, marginBottom:10, fontFamily:F.heading, fontWeight:800, letterSpacing:'-0.02em' }}>Réseau Coupé</h1>
            <p style={{ fontSize:'1.05rem', color:C.muted, maxWidth:400, marginBottom:40, lineHeight:1.6 }}>
                Vous êtes dans une zone sans internet. Cette page n'est pas encore enregistrée sur votre téléphone.
            </p>
            <div style={{ background:C.glass, backdropFilter:'blur(20px)', padding:24, borderRadius:24, border:`1px solid ${C.border}`, marginBottom:30 }}>
                <h3 style={{ margin:'0 0 16px', fontSize:'1rem', fontWeight:800, color:C.text, fontFamily:F.heading }}>Que pouvez-vous faire ?</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:12, textAlign:'left' }}>
                    {[
                        { icon:<BookOpen size={18} color={C.emerald}/>, text:'Consulter le Catalogue (Déjà chargé)' },
                        { icon:<ShoppingCart size={18} color={C.emerald}/>, text:'Préparer votre panier' },
                        { icon:<History size={18} color={C.emerald}/>, text:'Voir vos commandes passées' },
                    ].map((item, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, color:C.text, fontSize:'0.92rem' }}>
                            {item.icon} {item.text}
                        </div>
                    ))}
                </div>
            </div>
            <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, background:C.forest, color:'white', textDecoration:'none', padding:'16px 32px', borderRadius:100, fontWeight:800, boxShadow:'0 4px 16px rgba(6,78,59,0.2)', fontFamily:F.body }}>
                <ArrowLeft size={18}/> RETOURNER AU MARCHÉ
            </Link>
        </div>
    );
}
