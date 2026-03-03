'use client';

import React, { useState } from 'react';
import { Users, MapPin, Clock, CheckCircle, Play, Pause, Leaf, TreePine } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

interface Deal {
    id: string; title: string;
    organizer: { name: string; avatar: string; role: string };
    productImage: string; target: number; current: number;
    oldPrice: number; newPrice: number; location: string; timeLeft: string;
}

const MOCK_DEALS: Deal[] = [
    { id:'1', title:'Engrais NPK 15-15-15 (Sac 50kg)', organizer:{ name:'Moussa Koné', avatar:'https://randomuser.me/api/portraits/men/32.jpg', role:'Chef de Zone' }, productImage:'https://images.unsplash.com/photo-1622289694738-4e8979e2c65f?auto=format&fit=crop&w=500&q=60', target:50, current:42, oldPrice:25000, newPrice:21500, location:'Magasin Central, Ziniare', timeLeft:'2 jours' },
    { id:'2', title:'Semences Maïs Hybride (Boîte)', organizer:{ name:'Fatou Ouédraogo', avatar:'https://randomuser.me/api/portraits/women/44.jpg', role:'Vendeuse Certifiée' }, productImage:'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=500&q=60', target:20, current:5, oldPrice:3500, newPrice:2800, location:'Marché de Ségou', timeLeft:'5 jours' },
];

const GlassCard = ({ children, style, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
    <div style={{ background:C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:24, border:`1px solid ${C.border}`, ...style }} {...p}>{children}</div>
);

const DealCard = ({ deal }: { deal: Deal }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const pct = Math.min(100, Math.round((deal.current / deal.target) * 100));

    return (
        <GlassCard style={{ overflow:'hidden', marginBottom:20 }}>
            {/* Organizer header */}
            <div style={{ padding:'14px 20px', background:`${C.emerald}0A`, display:'flex', alignItems:'center', gap:12, borderBottom:`1px solid ${C.border}` }}>
                <div style={{ position:'relative' }}>
                    <img src={deal.organizer.avatar} alt={deal.organizer.name} style={{ width:40, height:40, borderRadius:'50%', border:'2px solid white', objectFit:'cover', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }} />
                    <CheckCircle size={14} color={C.emerald} style={{ position:'absolute', bottom:-2, right:-2, background:'white', borderRadius:'50%' }} />
                </div>
                <div>
                    <p style={{ fontSize:'0.72rem', color:C.muted, fontWeight:600, margin:0, fontFamily:F.body }}>Organisé par</p>
                    <p style={{ fontSize:'0.9rem', fontWeight:800, color:C.text, margin:0, fontFamily:F.body }}>{deal.organizer.name}</p>
                </div>
            </div>

            <div style={{ padding:20 }}>
                {/* Product & pricing */}
                <div style={{ display:'flex', gap:16, marginBottom:20 }}>
                    <div style={{ width:80, height:80, borderRadius:16, overflow:'hidden', flexShrink:0 }}>
                        <img src={deal.productImage} alt={deal.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </div>
                    <div style={{ flex:1 }}>
                        <h3 style={{ fontFamily:F.heading, fontWeight:800, color:C.text, fontSize:'1.05rem', lineHeight:1.2, margin:'0 0 6px' }}>{deal.title}</h3>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ color:C.muted, fontSize:'0.85rem', textDecoration:'line-through' }}>{deal.oldPrice.toLocaleString()} F</span>
                            <span style={{ color:C.forest, fontWeight:800, fontSize:'1.2rem', fontFamily:F.heading }}>{deal.newPrice.toLocaleString()} F</span>
                        </div>
                        <div style={{ display:'inline-block', background:`${C.emerald}14`, color:C.forest, fontSize:'0.72rem', fontWeight:700, padding:'4px 10px', borderRadius:100, marginTop:6, fontFamily:F.body }}>
                            Économisez {deal.oldPrice - deal.newPrice} F
                        </div>
                    </div>
                </div>

                {/* Audio */}
                <button onClick={() => setIsPlaying(!isPlaying)} style={{ width:'100%', marginBottom:16, padding:'10px 16px', borderRadius:100, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background: isPlaying ? `${C.emerald}14` : `${C.forest}08`, color: isPlaying ? C.forest : C.muted, border:`1px solid ${isPlaying ? `${C.emerald}30` : C.border}`, cursor:'pointer', fontFamily:F.body, fontWeight:600, fontSize:'0.85rem' }}>
                    {isPlaying ? <Pause size={16}/> : <Play size={16}/>}
                    {isPlaying ? 'En lecture...' : `Écouter ${deal.organizer.name.split(' ')[0]} expliquer`}
                </button>

                {/* Progress */}
                <div style={{ marginBottom:16 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', marginBottom:6, fontFamily:F.body }}>
                        <span style={{ color:C.forest, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><Users size={14}/> {deal.current} participants</span>
                        <span style={{ color:C.muted }}>Objectif: {deal.target}</span>
                    </div>
                    <div style={{ width:'100%', background:`${C.forest}0D`, borderRadius:100, height:10, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(90deg,${C.emerald},${C.forest})`, borderRadius:100, transition:'width 0.5s' }} />
                    </div>
                    <p style={{ fontSize:'0.72rem', color:C.muted, textAlign:'right', marginTop:4, fontFamily:F.body }}>Plus que {deal.target - deal.current} pour valider !</p>
                </div>

                {/* Logistics */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.78rem', color:C.muted, borderTop:`1px dashed ${C.border}`, paddingTop:14, marginTop:14, fontFamily:F.body }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}><MapPin size={14}/> {deal.location}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, color:C.amber, fontWeight:700 }}><Clock size={14}/> Fin dans {deal.timeLeft}</div>
                </div>

                {/* CTA */}
                <button style={{ width:'100%', marginTop:16, background:C.forest, color:'white', fontWeight:800, padding:'14px 24px', borderRadius:100, border:'none', cursor:'pointer', fontFamily:F.body, fontSize:'0.95rem', boxShadow:'0 4px 16px rgba(6,78,59,0.2)' }}>
                    Rejoindre le groupe
                </button>
            </div>
        </GlassCard>
    );
};

export default function GroupBuyingPage() {
    return (
        <div style={{ minHeight:'100vh', background:C.sand, paddingBottom:80, fontFamily:F.body }}>
            <header style={{ background:C.glass, backdropFilter:'blur(20px)', padding:'24px 20px', position:'sticky', top:0, zIndex:10, borderBottom:`1px solid ${C.border}` }}>
                <h1 style={{ fontSize:'1.6rem', fontWeight:800, color:C.forest, margin:0, fontFamily:F.heading, display:'flex', alignItems:'center', gap:8 }}>
                    <TreePine size={24}/> La Cour
                </h1>
                <p style={{ color:C.muted, fontSize:'0.9rem', margin:'4px 0 0' }}>Achetez ensemble, payez moins cher.</p>
            </header>
            <main style={{ padding:20, maxWidth:640, margin:'0 auto' }}>
                {MOCK_DEALS.map(deal => <DealCard key={deal.id} deal={deal} />)}
                {MOCK_DEALS.length === 0 && (
                    <div style={{ textAlign:'center', padding:40, color:C.muted }}>
                        <Leaf size={40} style={{ opacity:0.3, margin:'0 auto 12px' }} />
                        <p>Aucun achat groupé en cours dans votre zone.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
