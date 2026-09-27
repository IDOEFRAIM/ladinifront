'use client';

// Primitives d'animation « apparition au scroll ». Seuls ces wrappers sont clients :
// leurs `children` restent des Server Components rendus dans le HTML initial.
import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';

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

interface Base { children: ReactNode; style?: CSSProperties; className?: string }

export function RevealSection({ children, style, className, margin = '-60px' }: Base & { margin?: string }) {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin }}
      style={style}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function RevealItem({ children, style, className, variant = 'fadeUp' }: Base & { variant?: 'fadeUp' | 'scalePop' }) {
  return (
    <motion.div variants={variant === 'scalePop' ? scalePop : fadeUp} style={style} className={className}>
      {children}
    </motion.div>
  );
}
