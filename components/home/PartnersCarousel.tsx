'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Handshake, Leaf, MapPin } from 'lucide-react';
import GlassCard from './GlassCard';
import { C, F } from './tokens';

export interface Cooperative {
  name: string;
  /** Filières, une entrée par filière (affichées en pastilles). */
  types: string[];
  location: string;
  /** Mention facultative (ex. « En cours de négociation »). */
  note?: string;
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40, scale: 0.97 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 40, scale: 0.97 }),
};

// Accents issus de la charte (plus d'arc-en-ciel rose/violet/indigo) : alternance stable selon la position.
const ACCENTS = [C.emerald, C.amber, C.statBlue, C.lime];
const tint = (hex: string, alphaHex = '1F') => `${hex}${alphaHex}`;

const arrowStyle = {
  width: 48, height: 48, borderRadius: '50%', background: C.white, border: `1px solid ${C.border}`,
  boxShadow: '0 8px 24px rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
} as const;

export default function PartnersCarousel({ cooperatives }: { cooperatives: Cooperative[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const current = cooperatives[index];
  const accent = ACCENTS[index % ACCENTS.length];
  const counter = `${index + 1} / ${cooperatives.length}`;

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((prev) => (prev + dir + cooperatives.length) % cooperatives.length);
  };

  return (
    <>
      {/* Liste complète dans le HTML pour les robots et lecteurs d'écran (le carrousel n'en montre qu'une à la fois). */}
      <ul className="sr-only">
        {cooperatives.map((c) => (
          <li key={c.name}>{`${c.name} — ${c.types.join(', ')} — ${c.location}`}</li>
        ))}
      </ul>

      {/*
        Mobile : la carte prend TOUTE la largeur, les flèches passent dessous (avec le compteur au milieu).
        ≥ 640 px : flèches de part et d'autre de la carte, comme avant.
      */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-4 sm:gap-x-6 mx-auto" style={{ marginTop: 40, maxWidth: 620 }}>
        <button onClick={() => go(-1)} aria-label="Coopérative précédente" className="btn-pop order-2 sm:order-1" style={arrowStyle}>
          <ArrowLeft size={20} color={C.forest} />
        </button>

        <div className="order-1 col-span-3 sm:order-2 sm:col-span-1 min-w-0" style={{ overflow: 'hidden', padding: '10px 0' }} aria-live="polite">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50) go(1);
                else if (info.offset.x > 50) go(-1);
              }}
            >
              <GlassCard hover={false} style={{ padding: 'clamp(24px, 6vw, 40px) clamp(18px, 5vw, 32px)', textAlign: 'center', overflow: 'hidden' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: tint(accent), color: C.forest, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: F.mono, letterSpacing: '0.04em' }}>
                  <Leaf size={12} color={accent} /> Coopérative
                </div>

                <div style={{ width: 72, height: 72, borderRadius: 24, background: `linear-gradient(135deg, ${tint(accent)}, rgba(255,255,255,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${tint(accent)}` }}>
                  <Handshake size={32} color={accent} />
                </div>

                <h3 style={{ fontFamily: F.heading, fontSize: 'clamp(1.2rem, 4.5vw, 1.4rem)', fontWeight: 800, color: C.forest, marginBottom: 10, lineHeight: 1.2, textWrap: 'balance', overflowWrap: 'anywhere' }}>
                  {current.name}
                </h3>

                <p style={{ fontFamily: F.body, fontSize: '0.95rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                  <MapPin size={14} color={C.emerald} aria-hidden="true" /> {current.location}
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 4px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  {current.types.map((t) => (
                    <li key={t} style={{ background: tint(accent, '14'), color: C.forest, border: `1px solid ${tint(accent, '33')}`, borderRadius: 100, padding: '4px 12px', fontSize: 12.5, fontWeight: 600, fontFamily: F.body }}>
                      {t}
                    </li>
                  ))}
                </ul>

                {current.note && (
                  <p style={{ margin: '12px 0 0', fontFamily: F.body, fontSize: 12.5, fontStyle: 'italic', color: C.amber, fontWeight: 600 }}>{current.note}</p>
                )}

                {/* Compteur dans la carte sur grand écran ; sur mobile il est entre les flèches. */}
                <div className="hidden sm:block" style={{ marginTop: 24, fontFamily: F.mono, fontSize: 13, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em' }}>
                  {counter}
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="order-3 sm:hidden text-center" style={{ fontFamily: F.mono, fontSize: 13, color: C.muted, fontWeight: 600, letterSpacing: '0.1em' }} aria-hidden="true">
          {counter}
        </div>

        <button onClick={() => go(1)} aria-label="Coopérative suivante" className="btn-pop order-4 sm:order-3" style={arrowStyle}>
          <ArrowRight size={20} color={C.forest} />
        </button>
      </div>
    </>
  );
}
