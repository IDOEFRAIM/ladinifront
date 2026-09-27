'use client';

import { motion } from 'framer-motion';
import { FaExclamationTriangle } from 'react-icons/fa';
import { C } from '@/features/territory/components/detail/territory-detail.tokens';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: C.sand }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 rounded-full mb-4" style={{ border: `4px solid ${C.stone900}`, borderTopColor: 'transparent' }} />
      <p style={{ color: C.muted, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 10 }}>Chargement des données...</p>
    </div>
  );
}

export function NotFoundScreen({ router }: { router: any }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-20 text-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <FaExclamationTriangle size={56} color={C.amber} style={{ display: 'block', margin: '0 auto 18px' }} />
        <h2 style={{ fontSize: 28, fontWeight: 900, color: C.stone900 }}>Zone Introuvable</h2>
        <button onClick={() => router.push('/territories')} className="mt-8 px-8 py-3 rounded-2xl font-black" style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: '#fff' }}>RETOUR</button>
      </motion.div>
    </div>
  );
}
