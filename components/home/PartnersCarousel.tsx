'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Handshake, Leaf, MapPin } from 'lucide-react';
import GlassCard from './GlassCard';
import { C, F } from './tokens';

export interface Cooperative {
  name: string;
  type: string;
  location: string;
  color: string;
  bg: string;
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 40, scale: 0.95 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: -dir * 40, scale: 0.95 }),
};

const arrowStyle = {
  width: 48, height: 48, borderRadius: '50%', background: C.white, border: `1px solid ${C.border}`,
  boxShadow: '0 8px 24px rgba(6,78,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
} as const;

export default function PartnersCarousel({ cooperatives }: { cooperatives: Cooperative[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const current = cooperatives[index];

  const go = (dir: 1 | -1) => {
    setDirection(dir);
    setIndex((prev) => (prev + dir + cooperatives.length) % cooperatives.length);
  };

  return (
    <>
      {/* Liste complète dans le HTML pour les robots et lecteurs d'écran (le carrousel n'en montre qu'une à la fois). */}
      <ul className="sr-only">
        {cooperatives.map((c) => (
          <li key={c.name}>{`${c.name} — ${c.type} — ${c.location}`}</li>
        ))}
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 }}>
        <button onClick={() => go(-1)} aria-label="Coopérative précédente" className="btn-pop" style={arrowStyle}>
          <ArrowLeft size={20} color={C.forest} />
        </button>

        <div style={{ width: '100%', maxWidth: 500, overflow: 'hidden', padding: '10px 0' }} aria-live="polite">
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
                <div style={{ position: 'absolute', top: 16, right: 16, background: current.bg, color: current.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: F.mono, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Leaf size={12} /> Coopérative
                </div>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: `linear-gradient(135deg, ${current.bg}, rgba(255,255,255,0.5))`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: `1px solid ${current.bg}` }}>
                  <Handshake size={32} color={current.color} />
                </div>
                <h3 style={{ fontFamily: F.heading, fontSize: '1.4rem', fontWeight: 800, color: C.forest, marginBottom: 8 }}>{current.name}</h3>
                <p style={{ fontFamily: F.body, fontSize: '0.95rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
                  <MapPin size={14} color={C.emerald} /> {current.location} • {current.type}
                </p>
                <div style={{ fontFamily: F.mono, fontSize: 13, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.1em' }}>
                  {`${index + 1} / ${cooperatives.length}`}
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>
        </div>

        <button onClick={() => go(1)} aria-label="Coopérative suivante" className="btn-pop" style={arrowStyle}>
          <ArrowRight size={20} color={C.forest} />
        </button>
      </div>
    </>
  );
}
