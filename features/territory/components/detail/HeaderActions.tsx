'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FaArrowLeft, FaCheck } from 'react-icons/fa';
import { C } from '@/features/territory/components/detail/territory-detail.tokens';

export function HeaderActions({ router, isEditing, setIsEditing, handleUpdate }: any) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
      <button onClick={() => router.back()} className="flex items-center gap-3 transition-all font-black text-xs uppercase tracking-widest" style={{ color: C.muted }}>
        <FaArrowLeft /> RETOUR
      </button>
      <div className="flex gap-4">
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <motion.button 
              key="edit" onClick={() => setIsEditing(true)}
              className="transition-all"
              style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: '#fff', borderRadius: 28, fontWeight: 900, boxShadow: '0 10px 30px rgba(16,150,90,0.10)' }}
            >
              MODIFIER
            </motion.button>
          ) : (
            <motion.div key="save" className="flex gap-3">
              <button onClick={handleUpdate} className="px-8 py-3 rounded-2xl font-black flex items-center gap-2" style={{ background: C.emerald, color: '#fff', boxShadow: '0 10px 28px rgba(22,163,74,0.14)' }}>
                <FaCheck /> SAUVEGARDER
              </button>
              <button onClick={() => setIsEditing(false)} className="px-8 py-3 rounded-2xl font-black" style={{ background: 'transparent', color: C.muted, border: '1px solid rgba(0,0,0,0.04)' }}>ANNULER</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
