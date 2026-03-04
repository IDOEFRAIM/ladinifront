// app/(public)/page.tsx
// FrontAg - Gouvernance Agricole Numerique du Burkina Faso
// Design : Eco-Friendly Sustainable - Minimalisme Organique
"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  Sprout, Leaf, Sun, Droplets, Thermometer,
  BarChart3, TrendingUp, TrendingDown, Shield, Bot,
  ArrowRight, Globe, Zap, Database,
  Mic, ShieldCheck, Users, Warehouse, Eye, Lock,
  Activity, MapPin, CheckCircle2,
  Cpu, Radio
} from 'lucide-react';

/* ---------- DESIGN TOKENS ---------- */

const C = {
  forest:    '#064E3B',
  emerald:   '#10B981',
  lime:      '#84CC16',
  amber:     '#D97706',
  sand:      '#F9FBF8',
  white:     '#FFFFFF',
  text:      '#1F2937',
  muted:     '#64748B',
  border:    'rgba(6, 78, 59, 0.07)',
  glass:     'rgba(255, 255, 255, 0.72)',
  glassBold: 'rgba(255, 255, 255, 0.88)',
  statGreen: '#10B981',
  statBlue:  '#3B82F6',
  statAmber: '#F59E0B',
  statRose:  '#F43F5E',
};

const F = {
  heading: "'Space Grotesk', system-ui, sans-serif",
  body:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
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
              {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
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

function EcoRing({ value, color, size = 72, label }: { value: number; color: string; size?: number; label: string }) {
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const offset = circumference - (value / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 6} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={5} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={size / 2 - 6}
          fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: F.body }}>{label}</span>
    </div>
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

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <motion.header
      ref={ref}
      style={{ opacity, position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', padding: '0 6%', overflow: 'hidden' }}
    >
      <motion.div style={{ position: 'absolute', inset: 0, y: y1, background: 'radial-gradient(ellipse at 70% 20%, rgba(16,185,129,0.09) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(217,119,6,0.05) 0%, transparent 50%)' }} aria-hidden="true" />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1280, margin: '0 auto', display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>

        {/* LEFT - Text */}
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ flex: '1 1 480px', minWidth: 0 }}>
          <motion.div variants={fadeUp} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 100, background: C.glass, backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, marginBottom: 24 }}>
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald }} />
            <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 600, color: C.forest, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Gouvernance Agricole Num&eacute;rique
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} style={{ fontFamily: F.heading, fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.08, color: C.forest, letterSpacing: '-0.03em' }}>
            {"Cultiver l'avenir, "}
            <span style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {"prot\u00e9ger la terre."}
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} style={{ fontFamily: F.body, fontSize: '1.1rem', color: C.muted, lineHeight: 1.7, marginTop: 20, maxWidth: 520 }}>
            {"Une plateforme souveraine et \u00e9co-responsable reliant producteurs, institutions et march\u00e9s \u2014 avec l'IA au service de la s\u00e9curit\u00e9 alimentaire du Burkina Faso."}
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: '0 16px 48px rgba(6,78,59,0.18)' }}
              whileTap={{ scale: 0.98 }}
              style={{ fontFamily: F.body, background: C.forest, color: C.white, padding: '16px 32px', borderRadius: 100, border: 'none', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 10px 32px rgba(6,78,59,0.14)' }}
            >
              {"Ouvrir le march\u00e9"} <ArrowRight size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              style={{ fontFamily: F.body, background: C.glass, backdropFilter: 'blur(16px)', color: C.forest, padding: '16px 32px', borderRadius: 100, border: `1px solid ${C.border}`, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <Shield size={16} /> Espace institutionnel
            </motion.button>
          </motion.div>

          {/* Live data mini-badges */}
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            {[
              { icon: Droplets, label: 'Pluie 14h', color: C.statBlue },
              { icon: TrendingUp, label: 'Ma\u00efs +5%', color: C.statGreen },
              { icon: Radio, label: 'IA active', color: C.amber },
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

        {/* RIGHT - Floating dashboard preview */}
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ flex: '1 1 420px', minWidth: 0 }}>
          <motion.div className="grid grid-cols-2 gap-4 md:relative md:min-h-115" style={{ y: y2 }}>

            {/* AI Advisor card */}
            <motion.div variants={scalePop} className="col-span-2 md:absolute md:right-0 md:top-5 md:w-[min(340px,100%)] md:z-4">
              <GlassCard style={{ background: C.glassBold, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: 14, color: C.forest }}>Conseiller IA</div>
                    <div style={{ fontFamily: F.mono, fontSize: 11, color: C.emerald }}>RAG Engine &bull; en ligne</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ background: 'rgba(16,185,129,0.06)', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 13, color: C.text, fontFamily: F.body, lineHeight: 1.5 }}>
                    {"L'humidit\u00e9 sol est \u00e0 22%. Dois-je irriguer ?"}
                  </div>
                  <div style={{ background: C.forest, padding: '10px 14px', borderRadius: '16px 16px 4px 16px', fontSize: 13, color: '#fff', fontFamily: F.body, lineHeight: 1.5, alignSelf: 'flex-end', maxWidth: '88%' }}>
                    {"Pluie pr\u00e9vue ce soir (15mm). \u00c9conomisez l'eau."}
                    <span style={{ fontSize: 10, opacity: 0.7 }}> (source: ANM)</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingLeft: 4 }}>
                    {[0,1,2].map(i => (
                      <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }} style={{ width: 6, height: 6, borderRadius: 6, background: C.emerald }} />
                    ))}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 6, fontFamily: F.body }}>{"Recherche RAG\u2026"}</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Floating KPI */}
            <motion.div variants={scalePop} className="col-span-1 md:absolute md:left-0 md:top-50 md:z-5">
              <GlassCard style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', background: C.white, boxShadow: '0 12px 40px rgba(6,78,59,0.08)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sprout size={20} color={C.emerald} />
                </div>
                <div>
                  <div style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{"Rendement pr\u00e9vu"}</div>
                  <div style={{ fontFamily: F.mono, fontSize: '1.4rem', fontWeight: 800, color: C.forest }}>4.6 <span style={{ fontSize: 12, fontWeight: 500 }}>t/ha</span></div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Sensor node */}
            <motion.div
              variants={fadeUp}
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="col-span-1 flex items-center md:absolute md:left-15 md:top-20 md:z-3"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 100, background: C.white, boxShadow: '0 8px 32px rgba(6,78,59,0.06)', border: `1px solid ${C.border}` }}>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: F.body }}>Capteur Sol #A3</span>
              </div>
            </motion.div>

            {/* Eco rings */}
            <motion.div variants={scalePop} className="col-span-2 md:absolute md:right-2.5 md:bottom-2.5 md:z-2">
              <GlassCard style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <EcoRing value={72} color={C.emerald} size={56} label={"Sant\u00e9"} />
                <EcoRing value={58} color={C.amber} size={56} label="Eau" />
                <EcoRing value={85} color={C.statBlue} size={56} label="Sol" />
              </GlassCard>
            </motion.div>

          </motion.div>
        </motion.div>
      </div>
    </motion.header>
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
        <StatCard icon={Users}     label="Producteurs Actifs" value="2,847"   trend="+12%" trendUp accentBg="#F0FDF4" accentText={C.statGreen} />
        <StatCard icon={Warehouse} label="Stock National (t)"  value="18,430" trend="+8%"  trendUp accentBg="#EFF6FF" accentText={C.statBlue} />
        <StatCard icon={BarChart3} label="Transactions / mois" value="1,256"  trend="+23%" trendUp accentBg="#FFFBEB" accentText={C.statAmber} />
        <StatCard icon={Eye}       label="Agents IA Actifs"    value="6"      accentBg="#FFF1F2" accentText={C.statRose} />
      </div>
    </motion.section>
  );
}

/* ======= BENTO FEATURES ======= */

function BentoFeatures() {
  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      style={{ padding: '100px 6% 60px', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading
        tag="Plateforme Souveraine"
        title={"La technologie au service de la terre"}
        subtitle={"Trois piliers : Conseil intelligent, March\u00e9 connect\u00e9, Gouvernance transparente."}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6">

        {/* AXE 1 : Conseil IA */}
        <motion.div variants={fadeUp} className="md:col-span-7">
          <GlassCard style={{ minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 32 }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', marginBottom: 14 }}>
                <Bot size={14} color={C.emerald} />
                <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: 'uppercase' }}>{"Axe 1 \u2014 Conseil"}</span>
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>Conseiller Agronomique IA</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 420 }}>
                {"Recommandations ultra-locales sourc\u00e9es par notre moteur RAG : m\u00e9t\u00e9o ANAM, donn\u00e9es INERA, et historique parcellaire."}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, maxWidth: 380 }}>
              <motion.div
                initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                style={{ background: 'rgba(6,78,59,0.04)', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', fontSize: 13, color: C.text, fontFamily: F.body }}
              >
                {"Mon ma\u00efs jaunit sur les bords, que faire ?"}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                style={{ background: C.forest, padding: '10px 14px', borderRadius: '18px 18px 4px 18px', fontSize: 13, color: '#fff', fontFamily: F.body, alignSelf: 'flex-end', maxWidth: '85%', lineHeight: 1.5 }}
              >
                {"Carence en azote probable. Appliquez 50kg/ha d'ur\u00e9e."}
                <span style={{ opacity: 0.6, fontSize: 10 }}> (INERA Fiche #241)</span>
              </motion.div>
              <div style={{ display: 'flex', gap: 4, paddingLeft: 4, alignItems: 'center' }}>
                {[0,1,2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }} style={{ width: 6, height: 6, borderRadius: 6, background: C.emerald }} />
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* AXE 1b : Inclusion Vocale */}
        <motion.div variants={fadeUp} className="md:col-span-5">
          <GlassCard style={{ minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 32, background: `linear-gradient(160deg, ${C.glass}, rgba(217,119,6,0.04))` }}>
            <div>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Mic size={24} color={C.amber} />
              </div>
              <h3 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>Inclusion Vocale</h3>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', lineHeight: 1.6 }}>
                {"Interagissez avec l'IA en Moor\u00e9, Dioula et Fulfuld\u00e9. Aucune barri\u00e8re d'alphab\u00e9tisation."}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 20, paddingBottom: 4 }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [8, 16 + Math.random() * 20, 8] }}
                  transition={{ duration: 1.2 + Math.random() * 0.6, repeat: Infinity, delay: i * 0.05 }}
                  style={{ width: 4, borderRadius: 4, background: `linear-gradient(180deg, ${C.amber}, ${C.emerald})`, opacity: 0.6 }}
                />
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* AXE 2 : Marche A2A */}
        <motion.div variants={fadeUp} className="md:col-span-12">
          <GlassCard style={{ padding: 32, minHeight: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(59,130,246,0.08)', marginBottom: 12 }}>
                  <Globe size={14} color={C.statBlue} />
                  <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.statBlue, textTransform: 'uppercase' }}>{"Axe 2 \u2014 March\u00e9"}</span>
                </div>
                <h3 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest }}>{"March\u00e9 Agentic A2A"}</h3>
                <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', marginTop: 6, maxWidth: 460 }}>
                  {"Les agents IA connectent l'offre paysanne \u00e0 la demande en temps r\u00e9el \u2014 sans interm\u00e9diaires."}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ padding: '8px 14px', borderRadius: 100, background: 'rgba(16,185,129,0.08)', fontSize: 12, fontWeight: 700, color: C.emerald, fontFamily: F.mono }}>32 matchs / jour</div>
                <div style={{ padding: '8px 14px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: F.mono }}>{"0 interm\u00e9diaire"}</div>
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
        </motion.div>

        {/* AXE 3a : Souverainete */}
        <motion.div variants={fadeUp} className="md:col-span-5">
          <GlassCard style={{ minHeight: 280, padding: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <ShieldCheck size={22} color={C.statRose} />
            </div>
            <h3 style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>{"Souverainet\u00e9 des Donn\u00e9es"}</h3>
            <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', lineHeight: 1.6 }}>
              {"Multi-tenancy r\u00e9gional. Les donn\u00e9es du Sud-Ouest sont isol\u00e9es de celles du Nord. Tra\u00e7abilit\u00e9 compl\u00e8te \u2014 audit trail sur chaque d\u00e9cision."}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
              {[
                { t: '14:32', a: 'Agent IA #3 \u2014 Match valid\u00e9', c: C.emerald },
                { t: '14:28', a: 'Veto Dir. R\u00e9gional | Mil', c: C.statRose },
                { t: '14:15', a: 'Stock Ni\u00e9b\u00e9 certifi\u00e9', c: C.statBlue },
              ].map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 6, background: log.c, flexShrink: 0 }} />
                  <span style={{ fontFamily: F.mono, fontSize: 11, color: C.muted, flexShrink: 0 }}>{log.t}</span>
                  <span style={{ fontFamily: F.body, fontSize: 12, color: C.text }}>{log.a}</span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* AXE 3b : Capteurs & Financement */}
        <motion.div variants={fadeUp} className="md:col-span-7">
          <GlassCard style={{ minHeight: 280, padding: 32, overflow: 'hidden' }}>
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="flex-1">
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(132,204,22,0.1)', marginBottom: 14 }}>
                  <Leaf size={14} color={C.lime} />
                  <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.lime, textTransform: 'uppercase' }}>{"Axe 3 \u2014 Futur"}</span>
                </div>
                <h3 style={{ fontFamily: F.heading, fontSize: '1.3rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>{"Capteurs & Micro-Cr\u00e9dit"}</h3>
                <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {"Capteurs Edge discrets int\u00e9gr\u00e9s \u00e0 la nature. Ils g\u00e9n\u00e8rent un historique de confiance qui d\u00e9bloque automatiquement des financements."}
                </p>
                <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                  {[
                    { icon: Thermometer, label: '28\u00b0C', sub: 'Temp\u00e9rature' },
                    { icon: Droplets, label: '22%', sub: 'Humidit\u00e9' },
                    { icon: Sun, label: '6.2h', sub: 'Ensoleillement' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(16,185,129,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <s.icon size={16} color={C.emerald} />
                      </div>
                      <div>
                        <div style={{ fontFamily: F.mono, fontSize: 14, fontWeight: 800, color: C.forest }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: F.body }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center relative">
                <motion.div
                  animate={{ borderRadius: ['60% 40% 30% 70%/60% 30% 70% 40%', '30% 60% 70% 40%/50% 60% 30% 60%', '60% 40% 30% 70%/60% 30% 70% 40%'] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ width: 180, height: 180, background: `linear-gradient(135deg, rgba(16,185,129,0.12), rgba(132,204,22,0.08))`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                  <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 4, repeat: Infinity }} style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', position: 'absolute' }} />
                  <Cpu size={36} color={C.emerald} style={{ opacity: 0.4 }} />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', width: 160, height: 160, border: `1px dashed ${C.border}`, borderRadius: '50%' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 8, background: C.emerald, position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)' }} />
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </motion.section>
  );
}

/* ======= GOVERNANCE RBAC ======= */

function GovernanceSection() {
  const roles = [
    { icon: Lock, name: 'SuperAdmin', scope: 'Global', desc: "Politiques IAM, logs d'audit", color: C.statRose },
    { icon: MapPin, name: 'Dir. R\u00e9gional', scope: 'R\u00e9gional', desc: 'Supervision flux, droit de veto', color: C.statBlue },
    { icon: Users, name: 'Gestionnaire Zone', scope: 'Local', desc: 'Validation producteurs, stocks', color: C.emerald },
    { icon: Eye, name: 'SONAGESS', scope: 'Lecture seule', desc: 'Stocks nationaux, alertes', color: C.amber },
    { icon: Bot, name: 'Agent IA', scope: 'Automatis\u00e9', desc: 'A2A, prix RAG, matching', color: C.lime },
  ];

  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading
        tag="Contrôle & Transparence"
        title={"Une gestion par objectifs — chaque acteur à sa place"}
        subtitle={"Une architecture segmentée par organisation et par région. Chaque mouvement de stock ou décision est tracé pour garantir une intégrité totale des données agricoles."}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
        {roles.map((r, i) => (
          <motion.div key={i} variants={scalePop}>
            <GlassCard style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: `${r.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <r.icon size={22} color={r.color} />
              </div>
              <h4 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 700, color: C.forest }}>{r.name}</h4>
              <div style={{ fontFamily: F.mono, fontSize: 11, color: r.color, fontWeight: 600, marginTop: 4 }}>{r.scope}</div>
              <p style={{ fontFamily: F.body, fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{r.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

/* ======= IMPACT SECTION ======= */

function ImpactSection() {
  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '60px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        <motion.div variants={fadeUp}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 100, background: 'rgba(217,119,6,0.08)', marginBottom: 20 }}>
            <Leaf size={14} color={C.amber} />
            <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.amber, textTransform: 'uppercase' }}>Impact Durable</span>
          </div>
          <h2 style={{ fontFamily: F.heading, fontSize: '2.2rem', fontWeight: 800, color: C.forest, lineHeight: 1.15, marginBottom: 28 }}>
            La confiance comme<br /><span style={{ color: C.amber }}>{"mod\u00e8le de croissance."}</span>
          </h2>

          {[
            { icon: Activity, t: 'Transparence des March\u00e9s', d: "Le producteur acc\u00e8de enfin au prix r\u00e9el \u2014 aucun interm\u00e9diaire opaque." },
            { icon: ShieldCheck, t: 'Souverainet\u00e9 des Donn\u00e9es', d: 'Les data agricoles restent chez nous et servent la communaut\u00e9.' },
            { icon: Sprout, t: 'Accompagnement, pas Remplacement', d: "L'IA est une secr\u00e9taire intelligente, pas un patron." },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <item.icon size={20} color={C.emerald} />
              </div>
              <div>
                <h4 style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '1.05rem', color: C.forest, marginBottom: 4 }}>{item.t}</h4>
                <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', lineHeight: 1.6 }}>{item.d}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={scalePop}>
          <GlassCard style={{ padding: 48, textAlign: 'center', background: C.glassBold }}>
            <CheckCircle2 color={C.emerald} size={56} style={{ margin: '0 auto 24px' }} />
            <div style={{ fontFamily: F.mono, fontSize: '3.5rem', fontWeight: 900, color: C.forest, letterSpacing: '-0.04em' }}>+25%</div>
            <p style={{ fontFamily: F.body, fontSize: '1rem', fontWeight: 500, color: C.muted, marginTop: 12 }}>
              {"Augmentation moyenne des revenus via la connexion directe producteur\u2013acheteur."}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 28 }}>
              <EcoRing value={92} color={C.emerald} label="Confiance" />
              <EcoRing value={78} color={C.statBlue} label="Couverture" />
              <EcoRing value={65} color={C.amber} label={"Cr\u00e9dit"} />
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ======= TEAM SECTION ======= */

function TeamSection() {
  const team = [
    { name: 'IDO EFRAIM', role: 'CEO' },
    { name: 'BAMOGO DAVID', role: 'CSO' },
    { name: 'MIDIOUR JEROME', role: 'Relation' },
    { name: 'Tougma Ars\u00e8ne', role: 'Zone Ziniar\u00e9' },
    { name: 'Zantea Sosth\u00e8ne', role: 'Zone Ouaga' },
    { name: 'Ouatta Hakim', role: 'Zone Banfora' },
  ];

  return (
    <motion.section
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      style={{ padding: '80px 6%', maxWidth: 1280, margin: '0 auto' }}
    >
      <SectionHeading tag={"L'\u00c9quipe"} title={"Les b\u00e2tisseurs du syst\u00e8me"} subtitle={"Souverainet\u00e9, accompagnement, et impact local."} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
        {team.map((m, i) => (
          <motion.div key={i} variants={scalePop}>
            <GlassCard style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, rgba(16,185,129,0.1), rgba(217,119,6,0.08))`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: F.heading, fontSize: 24, fontWeight: 800, color: C.forest }}>{m.name.charAt(0)}</span>
              </div>
              <h4 style={{ fontFamily: F.heading, fontSize: '0.95rem', fontWeight: 700, color: C.forest }}>{m.name}</h4>
              <p style={{ fontFamily: F.mono, color: C.amber, fontSize: 12, fontWeight: 600, marginTop: 6 }}>{m.role}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.section>
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
        <KPIStrip />
        <BentoFeatures />
        <GovernanceSection />
        <ImpactSection />
        <TeamSection />
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
