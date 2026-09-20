'use client';

// Seule partie réellement interactive de la section « Marché direct » :
// le tracé SVG qui se dessine quand il entre dans le viewport.
import { motion } from 'framer-motion';
import { C } from './tokens';

const PATH = 'M60 60 C200 60, 240 20, 400 20 C560 20, 600 100, 740 100';

export default function MarketFlowSvg() {
  return (
    <svg viewBox="0 0 800 120" width="100%" height={120} style={{ marginTop: 12 }} role="img" aria-label="Du producteur à l'acheteur, sans intermédiaire">
      <defs>
        <linearGradient id="flowG" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={C.amber} />
          <stop offset="50%" stopColor={C.emerald} />
          <stop offset="100%" stopColor={C.forest} />
        </linearGradient>
      </defs>
      <motion.path d={PATH} stroke="url(#flowG)" strokeWidth={4} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2, ease: 'easeInOut' }} />
      <motion.path d={PATH} stroke={C.emerald} strokeWidth={14} fill="none" strokeLinecap="round" strokeOpacity={0.08}
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.3 }} />
      <motion.circle cx={400} cy={20} r={8} fill={C.emerald}
        initial={{ scale: 0 }} whileInView={{ scale: [0, 1.3, 1] }} viewport={{ once: true }} transition={{ delay: 1.2, duration: 0.6 }} />
      <circle cx={60} cy={60} r={16} fill="#fff" stroke={C.amber} strokeWidth={2} />
      <text x={60} y={90} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.amber} fontFamily="Inter, sans-serif">Producteur</text>
      <circle cx={740} cy={100} r={16} fill="#fff" stroke={C.forest} strokeWidth={2} />
      <text x={740} y={80} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.forest} fontFamily="Inter, sans-serif">Acheteur</text>
    </svg>
  );
}
