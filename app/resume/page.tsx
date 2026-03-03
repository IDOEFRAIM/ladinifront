'use client';

import React from 'react';
import { Layers, Shield, AlertTriangle, CheckCircle, GitBranch, UserCog, Tractor, ShoppingBasket } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif", mono:"'JetBrains Mono',monospace" };

const GlassCard = ({ children, style, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
    <div style={{ background:C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:24, border:`1px solid ${C.border}`, ...style }} {...p}>{children}</div>
);

export default function ProjectSummaryPage() {
    return (
        <div style={{ minHeight:'100vh', background:C.sand, padding:'24px', fontFamily:F.body, color:C.text }}>
            <div className="md:p-12" style={{ maxWidth:1100, margin:'0 auto' }}>
                {/* Header */}
                <header style={{ marginBottom:48, borderBottom:`1px solid ${C.border}`, paddingBottom:24 }}>
                    <h1 style={{ fontSize:'clamp(1.8rem,4vw,2.5rem)', fontWeight:800, color:C.text, marginBottom:8, display:'flex', alignItems:'center', gap:12, fontFamily:F.heading }}>
                        <Layers size={32} color={C.forest} /> Architecture & Vision du Projet
                    </h1>
                    <p style={{ fontSize:'1.05rem', color:C.muted, lineHeight:1.6 }}>Résumé technique de l'application Agri-App (Producteurs & Vente Directe).</p>
                </header>

                <div style={{ display:'grid', gap:24 }} className="md:grid-cols-2">
                    {/* Architecture */}
                    <GlassCard style={{ padding:32 }} className="md:col-span-2">
                        <h2 style={{ fontSize:'1.2rem', fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8, color:C.forest, fontFamily:F.heading }}>
                            <Layers size={20}/> Choix Structurel : Monolithe Next.js
                        </h2>
                        <p style={{ color:C.muted, marginBottom:20, lineHeight:1.6 }}>
                            Une seule application gère le site public, le dashboard producteur et l'administration.
                        </p>
                        <div style={{ display:'grid', gap:12 }} className="md:grid-cols-3">
                            {[
                                { label:'1. Public (Clients)', desc:'Site vitrine, catalogue produits, panier.', bg:`${C.forest}08`, color:C.forest },
                                { label:'2. Producteurs', desc:'Dashboard, Stocks, Ajout vocal, Commandes.', bg:`${C.emerald}14`, color:C.emerald },
                                { label:'3. Admin', desc:'Validation comptes, vue globale, litiges.', bg:`${C.amber}14`, color:C.amber },
                            ].map((item,i) => (
                                <div key={i} style={{ background:item.bg, padding:16, borderRadius:16, border:`1px solid ${item.color}20` }}>
                                    <h3 style={{ fontWeight:800, color:item.color, marginBottom:4, fontSize:'0.95rem', fontFamily:F.heading }}>{item.label}</h3>
                                    <p style={{ fontSize:'0.78rem', color:C.muted, margin:0 }}>{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Folder structure */}
                    <div style={{ background:C.forest, color:'rgba(255,255,255,0.7)', padding:32, borderRadius:24, fontFamily:F.mono, fontSize:'0.82rem', overflow:'auto' }}>
                        <h2 style={{ color:'white', fontWeight:800, marginBottom:16, display:'flex', alignItems:'center', gap:8, fontSize:'1.1rem', fontFamily:F.heading }}>
                            <GitBranch size={20}/> Structure des Dossiers
                        </h2>
                        <pre style={{ lineHeight:1.8, margin:0, whiteSpace:'pre-wrap' }}>{`app/
 (public)/           --> Zone Publique
    page.tsx        --> Accueil (/)
    products/       --> Catalogue
        [id]/
 productor/          --> Zone Producteur
    layout.tsx      --> Sidebar
    dashboard/      --> Stats
    products/       --> Gestion Stocks
       add/        --> Formulaire Ajout
       page.tsx    --> Liste Stocks
    orders/         --> Commandes
 admin/              --> Admin (/admin)
 api/                --> Backend (Partagé)
 components/         --> UI Kit
 middleware.ts       --> SÉCURITÉ`}</pre>
                    </div>

                    {/* Security & rules */}
                    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                        <div style={{ background:`${C.amber}0A`, padding:24, borderRadius:24, border:`1px solid ${C.amber}20` }}>
                            <h2 style={{ fontSize:'1rem', fontWeight:800, marginBottom:12, display:'flex', alignItems:'center', gap:8, color:C.amber, fontFamily:F.heading }}>
                                <AlertTriangle size={18}/> Règle Anti-Conflit
                            </h2>
                            <p style={{ fontSize:'0.85rem', color:C.text, marginBottom:8, lineHeight:1.5 }}>
                                <strong>Problème :</strong> Si on utilise <code style={{ background:`${C.amber}14`, padding:'2px 6px', borderRadius:6, fontSize:'0.8rem' }}>(productor)</code> et <code style={{ background:`${C.amber}14`, padding:'2px 6px', borderRadius:6, fontSize:'0.8rem' }}>(public)</code>, conflit d'URL <code style={{ fontWeight:800 }}>/products</code>.
                            </p>
                            <p style={{ fontSize:'0.85rem', color:C.text, lineHeight:1.5 }}>
                                <strong>Solution :</strong> Enlever les parenthèses du dossier producteur.
                            </p>
                            <div style={{ marginTop:8, fontFamily:F.mono, background:'white', padding:10, borderRadius:12, border:`1px solid ${C.amber}20`, fontSize:'0.78rem' }}>
                                Public : monsite.com/products<br/>Producteur : monsite.com/productor/products
                            </div>
                        </div>

                        <GlassCard style={{ padding:24 }}>
                            <h2 style={{ fontSize:'1rem', fontWeight:800, marginBottom:12, display:'flex', alignItems:'center', gap:8, color:C.text, fontFamily:F.heading }}>
                                <Shield size={18} color="#EF4444"/> Sécurité (Middleware)
                            </h2>
                            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                                {['Bloque /admin si pas admin.','Bloque /productor si pas connecté.','Redirige vers /login automatiquement.'].map((t,i) => (
                                    <div key={i} style={{ display:'flex', gap:8, fontSize:'0.85rem', color:C.muted, alignItems:'flex-start' }}>
                                        <CheckCircle size={16} color={C.emerald} style={{ marginTop:2, flexShrink:0 }}/> {t}
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>

                    {/* Features */}
                    <GlassCard style={{ padding:32 }} className="md:col-span-2">
                        <h2 style={{ fontSize:'1.2rem', fontWeight:800, marginBottom:24, color:C.text, fontFamily:F.heading }}>Fonctionnalités Implémentées / Prévues</h2>
                        <div style={{ display:'grid', gap:24 }} className="md:grid-cols-3">
                            {[
                                { icon:<ShoppingBasket size={20} color={C.forest}/>, title:'Acheteur', items:['Landing Page (Hero, Catégories)','Recherche & Filtres produits','Panier & Checkout (WhatsApp)','Historique achats'] },
                                { icon:<Tractor size={20} color={C.emerald}/>, title:'Producteur', items:['Ajout Produit (Dictaphone/Vocal)','Gestion Stocks (Liste & Edit)','Gestion Commandes (Workflow)','Profil & Localisation'] },
                                { icon:<UserCog size={20} color={C.amber}/>, title:'Admin', items:['Validation producteurs','Vue d\'ensemble des ventes','Gestion des catégories','Modération des contenus'] },
                            ].map((section,i) => (
                                <div key={i}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:800, color:C.text, paddingBottom:10, borderBottom:`1px solid ${C.border}`, marginBottom:12, fontFamily:F.heading }}>
                                        {section.icon} {section.title}
                                    </div>
                                    <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
                                        {section.items.map((item,j) => (
                                            <li key={j} style={{ fontSize:'0.85rem', color:C.muted, display:'flex', alignItems:'center', gap:6 }}>
                                                <CheckCircle size={14} color={C.emerald}/> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
