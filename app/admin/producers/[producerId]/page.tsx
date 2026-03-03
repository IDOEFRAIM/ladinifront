'use client';

import React, { useState } from 'react';
import { 
    ArrowUpRight, Truck, Mic, Database, Smartphone, 
    Target, ShieldCheck, CheckCircle2, HelpCircle, 
    ChevronDown, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 1. CONFIGURATION & THÈME ---
const THEME = {
    colors: {
        green: '#497a3a',
        orange: '#e65100',
        text: '#5b4636',
        muted: '#7c795d',
        border: '#e0e0d1',
        bgGradient: 'linear-gradient(120deg, #f7f5ee 70%, #e6f4ea 100%)',
        cardBg: '#f8faf7'
    },
    animations: {
        fadeInUp: {
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { duration: 0.6 }
        }
    }
};

// --- 2. COMPOSANTS ATOMIQUES (Petites briques) ---

const AgriculturalIllustration = () => (
    <div style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="160" height="160" viewBox="0 0 180 180" fill="none">
            <ellipse cx="90" cy="140" rx="60" ry="18" fill="#d9ead3" />
            <ellipse cx="90" cy="150" rx="40" ry="8" fill="#b6d7a8" />
            <rect x="65" y="90" width="50" height="35" rx="17" fill="#ffe599" />
            <path d="M65 125 Q90 110 115 125" stroke="#b6d7a8" strokeWidth="5" fill="none" />
            <circle cx="90" cy="70" r="32" fill="#f9cb9c" />
            <circle cx="90" cy="70" r="24" fill="#fff2cc" />
            <rect x="85" y="38" width="8" height="22" rx="4" fill="#93c47d" />
        </svg>
    </div>
);

const BentoCard = ({ icon: Icon, title, desc, colSpan, highlight = false }: any) => (
    <motion.div 
        {...THEME.animations.fadeInUp}
        style={{ 
            gridColumn: colSpan,
            padding: '40px',
            borderRadius: '32px',
            backgroundColor: highlight ? THEME.colors.orange : THEME.colors.cardBg,
            color: highlight ? 'white' : THEME.colors.text,
            border: `1px solid ${THEME.colors.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        }}
    >
        <div style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            backgroundColor: highlight ? 'rgba(255,255,255,0.2)' : '#e6f4ea',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: highlight ? 'white' : THEME.colors.green
        }}>
            <Icon size={24} />
        </div>
        <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px' }}>{title}</h3>
            <p style={{ opacity: 0.9, lineHeight: 1.5 }}>{desc}</p>
        </div>
    </motion.div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div style={{ borderBottom: `1px solid ${THEME.colors.border}`, padding: '24px 0' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: THEME.colors.green }}>{question}</span>
                {isOpen ? <ChevronUp color={THEME.colors.orange} /> : <ChevronDown color={THEME.colors.orange} />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', color: THEME.colors.muted, marginTop: '12px', lineHeight: 1.6 }}
                    >
                        {answer}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- 3. SECTIONS (Molecules) ---

function Hero() {
    return (
        <header style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 6%' }}>
            <div style={{ maxWidth: '950px', width: '100%', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap' }}>
                <AgriculturalIllustration />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', lineHeight: 1.1, fontWeight: 900, color: THEME.colors.green }}>
                        Bienvenue sur <span style={{ color: THEME.colors.orange }}>FrontAg</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', marginTop: '28px', color: THEME.colors.muted, lineHeight: '1.7' }}>
                        Ici, producteurs et consommateurs du Burkina Faso se rencontrent pour bâtir l’autosuffisance alimentaire.
                    </p>
                    <button style={{ marginTop: '38px', backgroundColor: THEME.colors.green, color: 'white', padding: '18px 40px', borderRadius: '16px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Découvrir le marché <ArrowUpRight size={20} />
                    </button>
                </motion.div>
            </div>
        </header>
    );
}

function BentoGrid() {
    const features = [
        { icon: Truck, colSpan: 'span 8', title: "Algorithme de Collecte", desc: "Optimisation dynamique des routes pour les producteurs ruraux. Réduction de 40% des pertes." },
        { icon: Mic, colSpan: 'span 4', title: "Inclusion Vocale", desc: "Interface en Mooré, Dioula et Fulfuldé.", highlight: true },
        { icon: Database, colSpan: 'span 5', title: "Edge Ledger", desc: "Certification des récoltes même sans connexion internet stable." },
        { icon: Smartphone, colSpan: 'span 7', title: "Micro-Crédit", desc: "Accès au financement basé sur l'historique de production certifié." }
    ];

    return (
        <section style={{ padding: '0 6% 80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: THEME.colors.green }}>Moteur de Croissance Locale</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '28px' }}>
                {features.map((f, i) => <BentoCard key={i} {...f} />)}
            </div>
        </section>
    );
}

function Team() {
    const members = [
        { name: "Dr. Issa Traoré", role: "CTO - MIT / Ouaga" },
        { name: "Mariam Sawadogo", role: "Impact Communautaire" },
        { name: "Ousmane Ouédraogo", role: "Architecture Cloud" },
        { name: "Sarah Koné", role: "Expertise Logistique" }
    ];

    return (
        <section style={{ padding: '80px 6%' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, color: THEME.colors.green }}>L'Équipe engagée</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                {members.map((m, i) => (
                    <motion.div key={i} whileHover={{ y: -8 }} style={{ textAlign: 'center', backgroundColor: THEME.colors.cardBg, padding: '32px', borderRadius: '24px', border: `1px solid ${THEME.colors.border}` }}>
                        <div style={{ width: 64, height: 64, backgroundColor: '#e6f4ea', borderRadius: '50%', margin: '0 auto 18px' }} />
                        <h4 style={{ fontWeight: 700, color: THEME.colors.green }}>{m.name}</h4>
                        <p style={{ color: THEME.colors.orange, fontSize: '0.9rem', fontWeight: 700 }}>{m.role}</p>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

// --- 4. COMPOSANT PRINCIPAL (LE CHEF D'ORCHESTRE) ---

export default function HomePage() {
    return (
        <div style={{ background: THEME.colors.bgGradient, color: THEME.colors.text, minHeight: '100vh', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            <Hero />
            <BentoGrid />
            
            {/* Impact Section */}
            <section style={{ padding: '80px 6%', backgroundColor: '#f8faf7', borderTop: `1px solid ${THEME.colors.border}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '60px', alignItems: 'center' }}>
                    <motion.div {...THEME.animations.fadeInUp}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '28px', color: THEME.colors.green }}>Transformer la terre par la <span style={{ color: THEME.colors.orange }}>Data</span>.</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <Target color={THEME.colors.orange} />
                                <div>
                                    <h4 style={{ fontWeight: 700 }}>Asymétrie d'Information</h4>
                                    <p style={{ color: THEME.colors.muted }}>Prix réel du marché en temps réel.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <div style={{ backgroundColor: '#e6f4ea', borderRadius: '36px', padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: THEME.colors.orange }}>+25%</div>
                        <p style={{ fontWeight: 700, color: THEME.colors.green }}>Revenus Directs Mesurés</p>
                    </div>
                </div>
            </section>

            <Team />

            {/* FAQ Section */}
            <section style={{ padding: '80px 6%', background: '#f7f5ee', borderTop: `1px solid ${THEME.colors.border}` }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '40px', textAlign: 'center', color: THEME.colors.green }}>Questions fréquentes</h2>
                    <FAQItem question="Comment garantissez-vous la qualité ?" answer="Chaque lot est inspecté physiquement et les données sont inscrites sur le registre numérique immuable." />
                    <FAQItem question="Fonctionnement sans internet ?" answer="Notre protocole USSD/SMS permet de certifier des lots même en zone blanche." />
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 6% 28px', borderTop: `1px solid ${THEME.colors.border}`, textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: THEME.colors.green }}>FRONT<span style={{ color: THEME.colors.orange }}>AG</span></h3>
                <p style={{ color: THEME.colors.muted, marginTop: '10px' }}>Indépendance alimentaire et excellence technologique au Burkina Faso.</p>
                <div style={{ marginTop: '30px', opacity: 0.6, fontSize: '0.8rem' }}>LA PATRIE OU LA MORT, NOUS VAINCRONS. © 2026</div>
            </footer>
        </div>
    );
}