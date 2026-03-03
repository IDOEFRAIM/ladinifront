'use client';

import React from 'react';
import { Mic, Server, Smartphone, Database, Tractor, ArrowRight, Shield, Cog, TrendingUp, Bot } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif", mono:"'JetBrains Mono',monospace" };

const GlassCard = ({ children, style, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
    <div style={{ background:C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:24, border:`1px solid ${C.border}`, ...style }} {...p}>{children}</div>
);

export default function InvestorDeckPage() {
    return (
        <div style={{ minHeight:'100vh', background:C.sand, fontFamily:F.body, color:C.text, paddingBottom:80 }}>
            {/* Hero */}
            <header style={{ background:C.forest, color:'white', paddingTop:80, paddingBottom:64, paddingLeft:24, paddingRight:24 }}>
                <div style={{ maxWidth:1100, margin:'0 auto' }}>
                    <div style={{ display:'inline-block', background:`${C.emerald}30`, fontSize:'0.72rem', fontWeight:800, padding:'6px 14px', borderRadius:100, marginBottom:16, letterSpacing:1, textTransform:'uppercase' }}>Architecture & Vision</div>
                    <h1 style={{ fontSize:'clamp(2rem,5vw,3rem)', fontWeight:800, marginBottom:24, lineHeight:1.1, fontFamily:F.heading }}>Le "Pont Numérique" Agricole</h1>
                    <p style={{ fontSize:'1.15rem', color:'rgba(255,255,255,0.7)', maxWidth:640, lineHeight:1.6 }}>
                        Comment notre architecture transforme la voix d'un producteur analphabète en une donnée e-commerce structurée et vendable instantanément.
                    </p>
                </div>
            </header>

            <main style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', marginTop:-40 }}>
                {/* Magic Flow */}
                <GlassCard style={{ padding:32, marginBottom:40, boxShadow:'0 20px 60px rgba(6,78,59,0.08)' }}>
                    <h2 style={{ fontSize:'1.3rem', fontWeight:800, marginBottom:32, display:'flex', alignItems:'center', gap:12, fontFamily:F.heading }}>
                        <Cog size={24} color={C.forest}/> La Mécanique : De la Voix au Panier
                    </h2>
                    <div style={{ display:'grid', gap:16 }} className="md:grid-cols-4">
                        {[
                            { icon:<Tractor size={24}/>, title:'1. Producteur', sub:'Interface Simplifiée', code:'<VoiceRecorder />', desc:'Capture un Blob Audio + Photo. Zéro texte requis.', bg:`${C.emerald}14`, accent:C.emerald },
                            { icon:<Server size={24}/>, title:'2. Moteur Next.js', sub:'API & Normalisation', code:'POST /api/products', desc:"Reçoit l'audio & l'image. Crée une entrée BDD.", bg:`${C.forest}08`, accent:C.forest },
                            { icon:<Bot size={24}/>, title:'3. Acheteur', sub:'Marketplace Public', code:'<ProductCard />', desc:"L'audio devient un Player. Le produit est achetable.", bg:`${C.amber}14`, accent:C.amber },
                            { icon:<Smartphone size={24}/>, title:'4. Transaction', sub:'Conversion', code:'WhatsApp API', desc:'Mise en relation directe pour sécuriser la vente.', bg:`${C.lime}14`, accent:C.lime },
                        ].map((step,i) => (
                            <div key={i} style={{ background:step.bg, padding:24, borderRadius:20, display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', border:`1px solid ${step.accent}20` }}>
                                <div style={{ background:step.accent, color:'white', padding:14, borderRadius:'50%', marginBottom:14, boxShadow:`0 8px 20px ${step.accent}30` }}>{step.icon}</div>
                                <h3 style={{ fontWeight:800, color:C.text, margin:'0 0 4px', fontFamily:F.heading, fontSize:'0.95rem' }}>{step.title}</h3>
                                <p style={{ fontSize:'0.72rem', color:C.muted, margin:'0 0 10px' }}>{step.sub}</p>
                                <div style={{ background:'white', padding:'6px 10px', borderRadius:8, fontSize:'0.72rem', fontFamily:F.mono, color:step.accent, width:'100%', border:`1px solid ${step.accent}20`, marginBottom:10 }}>{step.code}</div>
                                <p style={{ fontSize:'0.78rem', color:C.muted, lineHeight:1.4, margin:0 }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </GlassCard>

                {/* Philosophy */}
                <div style={{ display:'grid', gap:24, marginBottom:40 }} className="md:grid-cols-2">
                    <GlassCard style={{ padding:32 }}>
                        <h3 style={{ fontSize:'1.1rem', fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8, fontFamily:F.heading }}>
                            <Mic size={20} color={C.emerald}/> Philosophie "Voice First"
                        </h3>
                        <p style={{ color:C.muted, marginBottom:16, fontSize:'0.9rem', lineHeight:1.6 }}>
                            Contrairement aux plateformes classiques qui exigent du texte, notre architecture traite <strong style={{ color:C.text }}>le fichier audio comme une donnée de première classe</strong>.
                        </p>
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            {[
                                'Le composant AudioRecorder supprime la barrière de l\'illettrisme.',
                                'L\'audio est stocké et streamé directement sur la carte produit.'
                            ].map((t,i) => (
                                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, fontSize:'0.85rem' }}>
                                    <div style={{ width:24, height:24, borderRadius:'50%', background:`${C.emerald}14`, display:'flex', alignItems:'center', justifyContent:'center', color:C.forest, fontWeight:800, fontSize:'0.72rem', flexShrink:0 }}>{i+1}</div>
                                    <span style={{ color:C.muted }}>{t}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard style={{ padding:32 }}>
                        <h3 style={{ fontSize:'1.1rem', fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8, fontFamily:F.heading }}>
                            <Shield size={20} color={C.forest}/> Architecture Unifiée
                        </h3>
                        <p style={{ color:C.muted, marginBottom:16, fontSize:'0.9rem', lineHeight:1.6 }}>
                            Une seule instance Next.js gère trois écosystèmes distincts. Coûts de maintenance réduits par 3.
                        </p>
                        <div style={{ background:`${C.forest}05`, padding:16, borderRadius:16, border:`1px solid ${C.border}` }}>
                            {[
                                { label:'SHARED', color:C.forest, desc:'Base de Données, Types, Auth' },
                                { label:'UI KIT', color:C.emerald, desc:'Boutons, Cartes, Inputs' },
                                { label:'LOGIC', color:C.amber, desc:'Middleware de Sécurité' },
                            ].map((row,i) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom: i < 2 ? 10 : 0 }}>
                                    <span style={{ fontSize:'0.68rem', fontWeight:800, color:C.muted, width:56, fontFamily:F.mono }}>{row.label}</span>
                                    <div style={{ height:6, background:row.color, borderRadius:100, flex:1, opacity:0.25 }} />
                                    <span style={{ fontSize:'0.72rem', color:C.muted }}>{row.desc}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>

                {/* Scalability */}
                <div style={{ background:C.forest, color:'rgba(255,255,255,0.7)', padding:32, borderRadius:24, position:'relative', overflow:'hidden' }}>
                    <div style={{ position:'relative', zIndex:1 }}>
                        <h2 style={{ fontSize:'1.3rem', color:'white', fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:12, fontFamily:F.heading }}>
                            <TrendingUp size={24}/> Scalabilité & IA (Roadmap)
                        </h2>
                        <p style={{ marginBottom:24, maxWidth:640 }}>L'architecture est prête pour l'intégration IA sans refonte majeure.</p>
                        <div style={{ display:'grid', gap:16 }} className="md:grid-cols-3">
                            {[
                                { title:'Speech-to-Text', desc:"Transformation automatique de l'audio en texte pour le SEO." },
                                { title:'Classification Auto', desc:"Analyse de l'image pour suggérer la catégorie automatiquement." },
                                { title:'Agrégation', desc:'Regroupement intelligent des petits stocks pour vente B2B.' },
                            ].map((item,i) => (
                                <div key={i} style={{ background:'rgba(255,255,255,0.08)', padding:20, borderRadius:20, backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.1)' }}>
                                    <h4 style={{ color:'white', fontWeight:800, marginBottom:8, fontFamily:F.heading }}>{item.title}</h4>
                                    <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.5)', margin:0, lineHeight:1.5 }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <Database size={250} style={{ position:'absolute', right:-30, bottom:-60, opacity:0.05, color:'white' }} />
                </div>
            </main>
        </div>
    );
}
