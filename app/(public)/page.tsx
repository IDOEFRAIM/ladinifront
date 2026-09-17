// app/(public)/page.tsx
// LadiNi - Marche Agricole du Burkina Faso
// L'agriculteur au coeur de nos decisions.
"use client";

import React, { useRef, useState } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import {
  Sprout, Leaf, Fish, Beef,
  TrendingUp, ArrowRight, ArrowLeft, Globe,
  Mic, ShieldCheck, Store, Handshake,
  Wallet, MapPin, CheckCircle2, Bot, Plus, Star,ShoppingBag,Users,HeartHandshake,Heart,Mail,Phone,MessageSquare,Zap,Smartphone
} from 'lucide-react';
import Link from 'next/link'
/* ---------- DESIGN TOKENS ---------- */

const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  lime: '#84CC16',
  amber: '#D97706',
  sand: '#F9FBF8',
  white: '#FFFFFF',
  text: '#1F2937',
  muted: '#64748B',
  border: 'rgba(6, 78, 59, 0.07)',
  glass: 'rgba(255, 255, 255, 0.72)',
  glassBold: 'rgba(255, 255, 255, 0.88)',
  statGreen: '#10B981',
  statBlue: '#3B82F6',
  statAmber: '#F59E0B',
  statRose: '#F43F5E',
};

const F = {
  heading: "'Space Grotesk', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

/* ---------- ANIMATION HELPERS ---------- */

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 80, damping: 18 } },
};

const scalePop = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 16 } },
};

/* ---------- MICRO-COMPONENTS ---------- */

function OrganicBlobs() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '-8%', right: '-5%', width: '45vw', height: '45vw', borderRadius: '60% 40% 50% 70% / 50% 60% 40% 60%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, -20, 30, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', bottom: '-10%', left: '-8%', width: '50vw', height: '50vw', borderRadius: '40% 60% 70% 30% / 60% 30% 70% 40%', background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)' }}
      />
    </div>
  );
}

function FallingLeaf({ delay, left }: { delay: number; left: string }) {
  return (
    <motion.div
      initial={{ y: -40, x: 0, opacity: 0, rotate: 0 }}
      animate={{ y: '100vh', x: [0, 30, -20, 10], opacity: [0, 0.6, 0.6, 0], rotate: [0, 90, 180, 270] }}
      transition={{ duration: 14 + Math.random() * 8, delay, repeat: Infinity, ease: 'linear' }}
      style={{ position: 'fixed', left, top: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <Leaf size={16} color={C.emerald} style={{ opacity: 0.35 }} />
    </motion.div>
  );
}

function GlassCard({ children, style = {}, hover = true, ...rest }: any) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={hover ? { y: -4, boxShadow: 'inset 0 0 60px rgba(16,185,129,0.04), 0 16px 48px rgba(6,78,59,0.06)' } : undefined}
      style={{
        background: C.glass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${C.border}`,
        padding: 28,
        transition: 'box-shadow 0.4s ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendUp, accentBg, accentText }: {
  icon: any; label: string; value: string; trend?: string; trendUp?: boolean;
  accentBg: string; accentText: string;
}) {
  return (
    <motion.div variants={scalePop}>
      <GlassCard style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={20} color={accentText} />
          </div>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, fontFamily: F.mono, color: trendUp ? C.statGreen : C.statRose }}>
              <TrendingUp size={14} />
              {trend}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontFamily: F.body, fontSize: 13, color: C.muted, fontWeight: 500 }}>{label}</div>
          <div style={{ fontFamily: F.heading, fontSize: '1.65rem', fontWeight: 800, color: C.forest, marginTop: 4, letterSpacing: '-0.02em' }}>{value}</div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function SectionHeading({ tag, title, subtitle }: { tag: string; title: string; subtitle: string }) {
  return (
    <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', marginBottom: 16 }}>
        <Sprout size={14} color={C.emerald} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: F.body }}>{tag}</span>
      </div>
      <h2 style={{ fontFamily: F.heading, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: C.forest, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
        {title}
      </h2>
      <p style={{ fontFamily: F.body, color: C.muted, fontSize: '1.05rem', marginTop: 12, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>
    </motion.div>
  );
}

/* ======= HERO SECTION ======= */
export function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.header
      ref={ref}
      style={{ opacity, position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', padding: '0 6%', overflow: 'hidden' }}
    >
      <motion.div style={{ position: 'absolute', inset: 0, y: y1, background: 'radial-gradient(ellipse at 70% 20%, rgba(16,185,129,0.09) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(217,119,6,0.05) 0%, transparent 50%)' }} aria-hidden="true" />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>

        {/* Badge haut */}
        <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, marginBottom: 28 }}>
          <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald }} />
          <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.forest, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            LADINI &bull; March&eacute; Agricole
          </span>
        </motion.div>

        {/* Titre Poétique */}
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: F.heading,
            fontSize: 'clamp(2.4rem, 6vw, 4.4rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: C.forest,
            letterSpacing: '-0.03em',
            textAlign: 'center'
          }}
        >
          {"Quand "}
          <span style={{
            background: `linear-gradient(135deg, ${C.forest} 0%, ${C.emerald} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            {"producteur et acheteur"}
          </span>
          <br />
          <span style={{
            fontStyle: 'italic',
            fontWeight: 600,
            color: C.emerald
          }}>
            {"se rencontrent..."}
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          variants={fadeUp}
          style={{
            fontFamily: F.body,
            fontSize: '1.2rem',
            color: C.muted,
            lineHeight: 1.6,
            marginTop: 24,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {"La terre et la table se parlent enfin sans intermédiaire. "}
          <span style={{ fontWeight: 700, color: C.forest }}>LADINI</span>
          {" connecte directement nos producteurs aux restaurants et commerces. "}
          <span style={{ display: 'block', marginTop: 6, fontStyle: 'italic', color: C.emerald, fontWeight: 600 }}>
            {"Un marché direct, juste et transparent."}
          </span>
        </motion.p>

        {/* Boutons d'action */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
          <MotionLink
            href="/signup?role=seller"
            whileHover={{ scale: 1.03, boxShadow: '0 16px 48px rgba(6,78,59,0.18)' }}
            whileTap={{ scale: 0.98 }}
            style={{ fontFamily: F.body, background: C.forest, color: C.white, padding: '16px 32px', borderRadius: 100, border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', boxShadow: '0 10px 32px rgba(6,78,59,0.14)' }}
          >
            <Sprout size={16} /> {"Je vends ma production"}
          </MotionLink>

          <MotionLink
            href="/signup?role=buyer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            style={{ fontFamily: F.body, background: C.glass, backdropFilter: 'blur(16px)', color: C.forest, padding: '16px 32px', borderRadius: 100, border: `1px solid ${C.border}`, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <Store size={16} /> {"Je suis un acheteur"} <ArrowRight size={16} />
          </MotionLink>
        </motion.div>

        {/* Badges de confiance */}
        <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: Handshake, label: '6 coopératives partenaires', color: C.emerald },
            { icon: Wallet, label: 'Paiement direct au producteur', color: C.amber },
            { icon: ShieldCheck, label: 'Traçabilité de la ferme à l’assiette', color: C.statBlue },
          ].map((b, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 100, background: C.glassBold, border: `1px solid ${C.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.02)' }}
            >
              <b.icon size={14} color={b.color} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F.body }}>{b.label}</span>
            </motion.div>
          ))}
        </motion.div>

      </motion.div>
    </motion.header>
  );
}


/* ======= KPI STRIP ======= */

export function AIAgentSection() {
  return (
    <section style={{ padding: "80px 6%", background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)", position: "relative" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        
        {/* En-tête de section */}
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, background: "rgba(16,185,129,0.1)", border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <Bot size={16} color={C.emerald} />
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: C.forest, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              L'IA au service du terrain
            </span>
          </div>
          
          <h2 style={{ fontFamily: F.heading, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: C.forest, letterSpacing: "-0.02em" }}>
            Un Agent IA intelligent, accessible par WhatsApp & SMS
          </h2>
          <p style={{ fontFamily: F.body, fontSize: "1.1rem", color: C.muted, maxWidth: 650, margin: "16px auto 0", lineHeight: 1.6 }}>
            Pas besoin d'une connexion internet complexe. Notre assistant virtuel connecte directement producteurs et acheteurs en temps réel.
          </p>
        </div>

        {/* Grille Fonctionnalités IA */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          
          {/* Carte 1 */}
          <motion.div 
            whileHover={{ y: -5 }}
            style={{ background: "#FFFFFF", padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <MessageSquare size={24} color={C.emerald} />
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: "1.25rem", fontWeight: 700, color: C.forest, marginBottom: 10 }}>
              Commandes & Ventes par Chat
            </h3>
            <p style={{ fontFamily: F.body, fontSize: "0.95rem", color: C.muted, lineHeight: 1.6 }}>
              Publiez vos récoltes ou passez commande simplement en envoyant un message vocal ou texte sur WhatsApp et SMS.
            </p>
          </motion.div>

          {/* Carte 2 */}
          <motion.div 
            whileHover={{ y: -5 }}
            style={{ background: "#FFFFFF", padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(217,119,6,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Zap size={24} color={C.amber} />
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: "1.25rem", fontWeight: 700, color: C.forest, marginBottom: 10 }}>
              Mise en Relation Automatique
            </h3>
            <p style={{ fontFamily: F.body, fontSize: "0.95rem", color: C.muted, lineHeight: 1.6 }}>
              L'IA analyse les besoins des acheteurs et les stocks disponibles pour faire le matching parfait instantanément.
            </p>
          </motion.div>

          {/* Carte 3 */}
          <motion.div 
            whileHover={{ y: -5 }}
            style={{ background: "#FFFFFF", padding: 32, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(2,132,199,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <Smartphone size={24} color={C.statBlue} />
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: "1.25rem", fontWeight: 700, color: C.forest, marginBottom: 10 }}>
              Conseils & Prix du Marché
            </h3>
            <p style={{ fontFamily: F.body, fontSize: "0.95rem", color: C.muted, lineHeight: 1.6 }}>
              Obtenez des recommandations de prix équitables et un suivi agronomique directement dans votre canal habituel.
            </p>
          </motion.div>

        </div>

      </div>
    </section>
  );
}

/* ======= KPI STRIP ======= */

function KPIStrip() {
  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '0 6%', maxWidth: 1280, margin: '-40px auto 0', position: 'relative', zIndex: 12 }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        <StatCard icon={Handshake} label="Coopératives Partenaires" value="8" accentBg="#EFF6FF" accentText={C.statBlue} />
        <StatCard icon={Sprout} label="Filières couvertes" value="3" accentBg="#F0FDF4" accentText={C.statGreen} />
        <StatCard icon={Wallet} label="Du prix de vente pour le producteur" value="100%" accentBg="#FFFBEB" accentText={C.statAmber} />
        <StatCard icon={Store} label="Intermédiaire entre vous et l'acheteur" value="0" accentBg="#FFF1F2" accentText={C.statRose} />
      </div>
    </motion.section>
  );
}

/* ======= COMMENT CA MARCHE ======= */

function HowItWorksSection() {
  const steps = [
    {
      icon: ShoppingBag, // ou l'icône de votre choix
      t: "Offre en direct",
      d: "Les producteurs publient leurs récoltes et produits disponibles en toute autonomie, avec des prix et des quantités clairs."
    },
    {
      icon: Handshake,
      t: "Commande simplifiée",
      d: "Restaurants, commerces et institutions choisissent leurs produits en ligne et échangent directement avec les producteurs."
    },
    {
      icon: ShieldCheck,
      t: "Paiement & livraison directs",
      d: "Chaque transaction est sécurisée. L'acheteur est livré en toute sérénité, et la valeur va directement à celui qui produit."
    }
  ];

  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      style={{ padding: '100px 6% 40px', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading
        tag="Comment ça marche"
        title={"Une connexion simple en trois étapes"}
        subtitle={"Une plateforme pensée pour rapprocher les métiers de la terre et de la table en toute transparence."}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, marginTop: 40 }}>
        {steps.map((s, i) => (
          <motion.div key={i} variants={fadeUp}>
            <GlassCard style={{ padding: 32, height: '100%', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <s.icon size={22} color={C.emerald} />
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 800, color: C.emerald, background: 'rgba(16,185,129,0.08)', padding: '4px 10px', borderRadius: 20 }}>
                  {`0${i + 1}`}
                </span>
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.25rem', fontWeight: 800, color: C.forest, marginBottom: 10 }}>{s.t}</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', lineHeight: 1.6 }}>{s.d}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ======= NOS PRODUCTEURS ======= */

function ProducersSection() {
  const groups = [
    { icon: Sprout, t: 'Agriculteurs', d: 'Céréales, légumes et cultures vivrières vendus directement depuis le champ.', color: C.emerald, bg: '#F0FDF4' },
    { icon: Beef, t: 'Éleveurs', d: 'Bétail et produits d’élevage proposés en direct aux acheteurs professionnels.', color: C.amber, bg: '#FFFBEB' },
    { icon: Fish, t: 'Pisciculteurs', d: 'Poissons frais d’élevage local, livrés sans passer par des rev­endeurs multiples.', color: C.statBlue, bg: '#EFF6FF' },
  ];

  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '60px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading
        tag="Nos Producteurs"
        title={"Toute la ferme, un seul marché"}
        subtitle={"Trois familles de producteurs, une seule promesse : le juste prix, directement dans leurs mains."}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
        {groups.map((g, i) => (
          <motion.div key={i} variants={scalePop}>
            <GlassCard style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <g.icon size={26} color={g.color} />
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>{g.t}</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>{g.d}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ======= MARCHE DIRECT ======= */

function MarketFlowSection() {
  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '60px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <GlassCard style={{ padding: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(59,130,246,0.08)', marginBottom: 12 }}>
              <Globe size={14} color={C.statBlue} />
              <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.statBlue, textTransform: 'uppercase' }}>{"Marché Direct"}</span>
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 800, color: C.forest }}>{"Producteur → Acheteur, sans détour"}</h3>
            <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', marginTop: 8, maxWidth: 480 }}>
              {"Restaurants, commerces et institutions passent commande directement auprès des agriculteurs, éleveurs et pisciculteurs partenaires."}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '8px 14px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: F.mono }}>{"0 intermédiaire"}</div>
          </div>
        </div>

        <svg viewBox="0 0 800 120" width="100%" height={120} style={{ marginTop: 12 }}>
          <defs>
            <linearGradient id="flowG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={C.amber} />
              <stop offset="50%" stopColor={C.emerald} />
              <stop offset="100%" stopColor={C.forest} />
            </linearGradient>
          </defs>
          <motion.path
            d="M60 60 C200 60, 240 20, 400 20 C560 20, 600 100, 740 100"
            stroke="url(#flowG)" strokeWidth={4} fill="none" strokeLinecap="round"
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          <motion.path
            d="M60 60 C200 60, 240 20, 400 20 C560 20, 600 100, 740 100"
            stroke={C.emerald} strokeWidth={14} fill="none" strokeLinecap="round" strokeOpacity={0.08}
            initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
            transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.3 }}
          />
          <motion.circle cx={400} cy={20} r={8} fill={C.emerald} initial={{ scale: 0 }} whileInView={{ scale: [0, 1.3, 1] }} viewport={{ once: true }} transition={{ delay: 1.2, duration: 0.6 }} />
          <circle cx={60} cy={60} r={16} fill="#fff" stroke={C.amber} strokeWidth={2} />
          <text x={60} y={90} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.amber} fontFamily="Inter, sans-serif">Producteur</text>
          <circle cx={740} cy={100} r={16} fill="#fff" stroke={C.forest} strokeWidth={2} />
          <text x={740} y={80} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.forest} fontFamily="Inter, sans-serif">Acheteur</text>
        </svg>
      </GlassCard>
    </motion.section>
  );
}

/* ======= NOS ENGAGEMENTS (VALEURS) ======= */

export function ValuesSection() {
  const values = [
    { 
      icon: Wallet, 
      t: 'Un modèle juste, d’humain à humain', 
      d: "Derrière chaque récolte, il y a des semaines de labeur. Nous veillons à ce que le producteur soit rémunéré à la hauteur de ses efforts, tout en offrant aux acheteurs des prix honnêtes, sans intermédiaires qui gonflent la note." 
    },
    { 
      icon: Mic, 
      t: 'Inclusif, dans la langue du cœur', 
      d: "La technologie ne doit laisser personne au bord du chemin. Que ce soit sur le Web, WhatsApp, par SMS ou vocalement en Mooré, Dioula et Fulfuldé(dans nos futures versions), chacun peut échanger et vendre en toute liberté." 
    },
    { 
      icon: ShieldCheck, 
      t: 'La confiance comme seule promesse', 
      d: "Savoir d'où vient ce que l'on met dans nos assiettes, c'est essentiel. Nous tissons des liens de transparence durables pour que chaque commande soit une poignée de main sincère entre le champ et la table." 
    },
  ];

  return (
    <motion.section
      variants={stagger} 
      initial="hidden" 
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Colonne de gauche : Engagements */}
        <motion.div variants={fadeUp}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', marginBottom: 20 }}>
            <Leaf size={14} color={C.amber} />
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ce qui nous anime
            </span>
          </div>
          
          <h2 style={{ fontFamily: F.heading, fontSize: '2.3rem', fontWeight: 800, color: C.forest, lineHeight: 1.2, marginBottom: 28 }}>
            {"Redonner du sens"}<br />
            <span style={{ color: C.amber }}>{"à chaque lien qu'on tisse."}</span>
          </h2>

          {values.map((item, i) => (
            <motion.div key={i} variants={fadeUp} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <item.icon size={22} color={C.emerald} />
              </div>
              <div>
                <h4 style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '1.1rem', color: C.forest, marginBottom: 4 }}>
                  {item.t}
                </h4>
                <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {item.d}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Colonne de droite : Carte mise en valeur */}
        <motion.div variants={scalePop}>
          <GlassCard style={{ padding: 48, textAlign: 'center', background: C.glassBold, borderRadius: 24, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <HeartHandshake color={C.emerald} size={36} />
            </div>
            
            <h3 style={{ fontFamily: F.heading, fontSize: '1.45rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              {"Plus qu'une technologie, une alliance pour notre terre"}
            </h3>
            
            <p style={{ fontFamily: F.body, fontSize: '0.98rem', fontWeight: 500, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
              {"Derrière Ladini, il y a des hommes et des femmes qui travaillent la terre et d'autres qui nourrissent nos villes. Notre rôle est simplement d'être le pont qui les rassemble, dans le respect et la fraternité."}
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 28, justifyContent: 'center', padding: '10px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.05)' }}>
              <Users size={18} color={C.emerald} />
              <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 600, color: C.forest }}>
                {"Déjà 8 coopératives et fermiers partenaires à nos côtés"}
              </span>
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </motion.section>
  );
}

export function PartnersSection() {
  // Exactement 8 coopératives pour le carrousel normal
  const cooperatives = [
    { name: "AFEN", type: "AGROALIMENTAIRE", location: "KADIOGO", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    { name: "Coopérative Namaneb zanga", type: "Maraichers", location: "OUAGADOUGOU", color: "#d97706", bg: "rgba(217,119,6,0.12)" },
    { name: "Fromagerie Gariko", type: "Laitiers", location: "KADIOGO", color: "#84cc16", bg: "rgba(132,204,22,0.12)" },
    { name: "Coopérative Soulama", type: "Transformation", location: "A PRECISE", color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
    { name: "COOP-Bendia", type: "maraichers+transformation ", location: "OUAGADOUGOU", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    { name: "UPPA", type: "CEREALES , Maraichers, fruits et légumes ,", location: "Kenedougou", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
    { name: "Kosam", type: "Laitiers", location: "OUAGADOUGOU", color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    { name: "CARTPL(en cours de négociation) ", type: "Transformation", location: "OUAGADOUGOU", color: "#eab308", bg: "rgba(234,179,8,0.12)" }
  ];

  const [index, setIndex] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((prev) => (prev + dir + cooperatives.length) % cooperatives.length);
  };

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 40, scale: 0.95 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (dir: number) => ({ opacity: 0, x: -dir * 40, scale: 0.95 }),
  };

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading
        tag="Notre Réseau"
        title={"8 coopératives connectées"}
        subtitle={"Des collectifs d'agriculteurs, d'éleveurs et de pisciculteurs engagés qui vendent en direct."}
      />

      {/* --- PARTIE 1 : LE CARROUSEL NORMAL (8 Coopératives) --- */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 }}>

        <button
          onClick={() => go(-1)}
          aria-label="Coopérative précédente"
          style={{ width: 48, height: 48, borderRadius: '50%', background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
          onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ArrowLeft size={20} color={C.forest} />
        </button>

        <div style={{ width: '100%', maxWidth: 500, overflow: 'hidden', padding: '10px 0' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
            >
              <GlassCard hover={false} style={{ padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, background: cooperatives[index].bg, color: cooperatives[index].color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: F.mono, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Leaf size={12} /> Coopérative
                </div>

                <div style={{ width: 72, height: 72, borderRadius: 24, background: `linear-gradient(135deg, ${cooperatives[index].bg}, rgba(255,255,255,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${cooperatives[index].bg}` }}>
                  <Handshake size={32} color={cooperatives[index].color} />
                </div>

                <h3 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>
                  {cooperatives[index].name}
                </h3>

                <p style={{ fontFamily: F.body, fontSize: '0.95rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                  <MapPin size={14} color={C.emerald} /> {cooperatives[index].location} • {cooperatives[index].type}
                </p>

                <div style={{ fontFamily: F.mono, fontSize: 13, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em' }}>
                  {`${index + 1} / ${cooperatives.length}`}
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={() => go(1)}
          aria-label="Coopérative suivante"
          style={{ width: 48, height: 48, borderRadius: '50%', background: C.white, border: `1px solid ${C.border}`, boxShadow: '0 8px 24px rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
          onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ArrowRight size={20} color={C.forest} />
        </button>

      </motion.div>

      {/* --- PARTIE 2 : LE PLUS VERTICAL --- */}
      <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '32px 0' }}>
        <div style={{ width: 2, height: 48, background: `linear-gradient(to bottom, transparent, ${C.emerald}40)` }} />
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.emerald, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${C.emerald}40`, zIndex: 2 }}>
          <Plus size={24} strokeWidth={3} />
        </div>
        <div style={{ width: 2, height: 48, background: `linear-gradient(to top, transparent, ${C.emerald}40)` }} />
      </motion.div>

      {/* --- PARTIE 3 : LA FERME D'HUGO BOSS (Opérateur Majeur) --- */}
      <motion.div variants={fadeUp} style={{ maxWidth: 700, margin: '0 auto' }}>
        <GlassCard hover={true} style={{ padding: '40px', border: `2px solid ${C.emerald}30`, position: 'relative', overflow: 'hidden', textAlign: 'center', background: `linear-gradient(180deg, ${C.white} 0%, rgba(16,185,129,0.03) 100%)` }}>

          {/* Badge Opérateur Majeur */}
          <div style={{ position: 'absolute', top: 0, right: 0, background: C.emerald, color: C.white, padding: '8px 20px', borderBottomLeftRadius: 24, fontSize: 13, fontWeight: 700, fontFamily: F.heading, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '-4px 4px 12px rgba(16,185,129,0.2)' }}>
            <Star size={14} fill={C.white} /> Ambassadeur officielle
          </div>

          <div style={{ width: 80, height: 80, borderRadius: 28, background: `linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Handshake size={36} color={C.emerald} />
          </div>

          <h3 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, marginBottom: 12 }}>
            La Ferme d'Hugo Boss
          </h3>

          <p style={{ fontFamily: F.body, fontSize: '1.05rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <MapPin size={16} color={C.emerald} /> Ouagadougou • Agriculture • Aviculture
          </p>

          <p style={{ fontFamily: F.body, fontSize: '1rem', color: C.muted, lineHeight: 1.6, maxWidth: 500, margin: '0 auto' }}>
            Un acteur agricole incontournable de notre région. Sa capacité de production et son exigence d'excellence viennent renforcer massivement l'offre disponible pour nos acheteurs en direct.
          </p>

        </GlassCard>
      </motion.div>

    </motion.section>
  );
}

/* ======= CTA FINALE ======= */

// Création des composants Link animés
const MotionLink = motion.create(Link);

export function FinalCTASection() {
  return (
    <motion.section
      variants={stagger} 
      initial="hidden" 
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '40px 6% 100px', maxWidth: 1280, margin: '0 auto' }}
    >
      <motion.div variants={scalePop}>
        <GlassCard style={{ padding: '56px 40px', textAlign: 'center', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, border: 'none', borderRadius: 24 }}>
          <MapPin size={32} color="#fff" style={{ margin: '0 auto 20px', opacity: 0.9 }} />
          
          <h2 style={{ fontFamily: F.heading, fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
            {"Producteur ou acheteur — rejoignez le marché."}
          </h2>
          
          <p style={{ fontFamily: F.body, color: 'rgba(255,255,255,0.9)', fontSize: '1rem', maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.6 }}>
            {"Que vous récoltiez la terre ou nourrissiez nos villes, nous simplifions chaque échange. Rejoignez une communauté déjà forte de 6 coopératives et éleveurs partenaires."}
          </p>
          
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* Redirection Producteur */}
            <MotionLink
              href="/signup?role=seller"
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.98 }}
              style={{ 
                fontFamily: F.body, 
                background: '#fff', 
                color: C.forest, 
                padding: '16px 32px', 
                borderRadius: 100, 
                fontSize: '0.95rem', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 10, 
                textDecoration: 'none' 
              }}
            >
              {"Je vends ma production"} <ArrowRight size={16} />
            </MotionLink>

            {/* Redirection Acheteur */}
            <MotionLink
              href="/signup?role=buyer"
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.98 }}
              style={{ 
                fontFamily: F.body, 
                background: 'rgba(255,255,255,0.12)', 
                color: '#fff', 
                padding: '16px 32px', 
                borderRadius: 100, 
                border: '1px solid rgba(255,255,255,0.3)', 
                fontSize: '0.95rem', 
                fontWeight: 700, 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 10, 
                textDecoration: 'none' 
              }}
            >
              {"Je suis un acheteur"}
            </MotionLink>
          </div>
        </GlassCard>
      </motion.div>
    </motion.section>
  );
}

/* ======= FOOTER ======= */

export function Footer() {
  return (
    <footer style={{ background: C.forest, color: "#fff", paddingTop: 60, paddingBottom: 30, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 6%" }}>
        
        {/* Grille Principale */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10" style={{ marginBottom: 48 }}>
          
          {/* Colonne 1 : À propos & Vision */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.emerald, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Leaf size={18} color="#fff" />
              </div>
              <span style={{ fontFamily: F.heading, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                LADINI
              </span>
            </div>
            <p style={{ fontFamily: F.body, color: "rgba(255,255,255,0.75)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {"Le marché agricole direct. Nous connectons la terre et la table pour une rémunération juste des producteurs et des produits locaux d'exception."}
            </p>
          </div>

          {/* Colonne 2 : Liens Rapides */}
          <div>
            <h4 style={{ fontFamily: F.heading, fontSize: "1.05rem", fontWeight: 700, marginBottom: 16, color: C.amber }}>
              {"Navigation"}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <MotionLink href="/production" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Vendre ma production"}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/buyer-dashboard" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Espace Acheteur"}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/catalogue" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Nos Produits & Offres"}
                </MotionLink>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Informations Légales & CGU */}
          <div>
            <h4 style={{ fontFamily: F.heading, fontSize: "1.05rem", fontWeight: 700, marginBottom: 16, color: C.amber }}>
              {"Légal & Confidentialité"}
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <li>
                <MotionLink href="/cgu" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Conditions Générales d'Utilisation (CGU)"}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/cluf" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Contrat de Licence Utilisateur (CLUF)"}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/privacy" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: "0.9rem", fontFamily: F.body }}>
                  {"Politique de Confidentialité"}
                </MotionLink>
              </li>
            </ul>
          </div>

          {/* Colonne 4 : Contact Direct */}
          <div>
            <h4 style={{ fontFamily: F.heading, fontSize: "1.05rem", fontWeight: 700, marginBottom: 16, color: C.amber }}>
              {"Contactez-nous"}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "0.9rem", fontFamily: F.body, color: "rgba(255,255,255,0.85)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Phone size={16} color={C.emerald} />
                <span>+226 01 47 98 00 / +226 68 81 52 99</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Mail size={16} color={C.emerald} />
                <span>contact@ladini.com</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MapPin size={16} color={C.emerald} />
                <span>Burkina Faso</span>
              </div>
            </div>
          </div>

        </div>

        {/* Ligne de séparation */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontFamily: F.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            © {new Date().getFullYear()} LADINI. Tous droits réservés.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: F.body, fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}>
            <span>Fait avec</span>
            <Heart size={14} color="#ef4444" fill="#ef4444" />
            <span>pour nos producteurs</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
/* ======= MAIN PAGE ======= */

export default function HomePage() {
  return (
    <div style={{ background: C.sand, minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <OrganicBlobs />
      {[10, 25, 45, 65, 82].map((l, i) => (
        <FallingLeaf key={i} left={`${l}%`} delay={i * 2.5} />
      ))}

      <div style={{ position: 'relative', zIndex: 2 }}>
        <HeroSection />
        <AIAgentSection/>    
            <KPIStrip />
<ProducersSection />
        <MarketFlowSection />
        <ValuesSection />
        <PartnersSection />
        <FinalCTASection />
        <Footer />
      </div>
    </div>
  );
}
