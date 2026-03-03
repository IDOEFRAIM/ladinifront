'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, Leaf, X } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const GlassCard = ({ children, style, hover }: { children: React.ReactNode; style?: React.CSSProperties; hover?: boolean }) => (
  <motion.div
    whileHover={hover ? { y: -2, boxShadow: '0 12px 40px rgba(6,78,59,0.10)' } : undefined}
    style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }}
  >
    {children}
  </motion.div>
);

export default function CartPage() {
  const { items, cartTotal, clearCart, removeFromCart } = useCart();

  return (
    <div style={{ background: C.sand, color: C.text, minHeight: '100vh', padding: '32px 5%' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, margin: 0 }}>Mon Panier</h1>
              <p style={{ fontFamily: F.body, fontSize: '0.85rem', color: C.muted, margin: 0 }}>{items.length} article{items.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          {items.length > 0 && (
            <button onClick={clearCart} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: 'none', borderRadius: 100, padding: '10px 20px', fontFamily: F.body, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              <X size={16} /> Vider
            </button>
          )}
        </motion.div>

        {items.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <GlassCard style={{ padding: 60, textAlign: 'center' as const }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Leaf size={36} color={C.emerald} />
              </div>
              <p style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 700, color: C.forest, marginBottom: 8 }}>Votre panier est vide</p>
              <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem', marginBottom: 24 }}>Découvrez nos produits frais du terroir burkinabè</p>
              <Link href="/catalogue" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontFamily: F.body, fontWeight: 700, padding: '14px 32px', borderRadius: 100, textDecoration: 'none', fontSize: '0.95rem' }}>
                Explorer le catalogue <ArrowRight size={18} />
              </Link>
            </GlassCard>
          </motion.div>
        ) : (
          <div style={{ display: 'grid', gap: 28 }} className="lg:grid-cols-3">
            {/* Items list */}
            <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <GlassCard hover style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                        <img
                          src={item.images?.[0] ? `/uploads/products/${item.images[0]}` : '/placeholder.jpg'}
                          alt={item.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: F.heading, fontWeight: 700, fontSize: '1rem', color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                        <div style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted, marginTop: 2 }}>Qté : {item.quantity}</div>
                      </div>
                      <div style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '1.1rem', color: C.amber, whiteSpace: 'nowrap' }}>
                        {item.price.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>CFA</span>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} title="Supprimer" style={{ background: 'rgba(239,68,68,0.06)', border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={18} color="#EF4444" />
                      </button>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary sidebar */}
            <div>
              <div style={{ background: C.forest, borderRadius: 24, padding: 28, position: 'sticky' as const, top: 90, color: 'white' }}>
                <h3 style={{ fontFamily: F.heading, fontWeight: 800, fontSize: '1rem', marginBottom: 20, opacity: 0.7, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Résumé</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: F.body, fontSize: '0.9rem', opacity: 0.7 }}>
                  <span>Sous-total</span>
                  <span>{cartTotal.toLocaleString()} CFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: F.body, fontSize: '0.9rem', opacity: 0.7 }}>
                  <span>Livraison</span>
                  <span style={{ color: C.emerald }}>Gratuite</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.15)', margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                  <span style={{ fontFamily: F.body, fontSize: '0.85rem', opacity: 0.7 }}>Total</span>
                  <span style={{ fontFamily: F.heading, fontWeight: 900, fontSize: '1.8rem' }}>{cartTotal.toLocaleString()} <small style={{ fontSize: '0.7rem' }}>CFA</small></span>
                </div>
                <Link href="/checkout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: `linear-gradient(135deg, ${C.amber}, #F59E0B)`, color: 'white', fontFamily: F.body, fontWeight: 800, padding: '16px 24px', borderRadius: 100, textDecoration: 'none', fontSize: '1rem' }}>
                  Commander <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
