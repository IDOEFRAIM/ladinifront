'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CallButton from '@/components/CallButton';
import { Package, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pending:    { bg: 'rgba(217,119,6,0.08)', color: '#D97706', border: 'rgba(217,119,6,0.15)' },
  confirmed:  { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.15)' },
  delivering: { bg: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: 'rgba(139,92,246,0.15)' },
  delivered:  { bg: 'rgba(16,185,129,0.08)', color: '#10B981', border: 'rgba(16,185,129,0.15)' },
  cancelled:  { bg: 'rgba(239,68,68,0.08)',  color: '#EF4444', border: 'rgba(239,68,68,0.15)' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente', confirmed: 'Validee', delivering: 'En route', delivered: 'Terminee', cancelled: 'Annulee',
};

function GlassCard({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }} {...props}>{children}</div>;
}

export default function OrdersTabs({ initialOrders }: { initialOrders: any[] }) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const currentOrders = initialOrders.filter(o => ['pending', 'confirmed', 'delivering'].includes(o.status));
  const historyOrders = initialOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const displayedOrders = activeTab === 'current' ? currentOrders : historyOrders;

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 112, fontFamily: F.body }}>
      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(249,251,248,0.85)', backdropFilter: 'blur(20px)', padding: 24, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: F.heading, fontSize: '1.75rem', fontWeight: 900, color: C.forest, letterSpacing: '-0.02em' }}>Commandes</h1>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 2, marginTop: 6 }}>Gestion Production</p>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color="white" />
          </div>
        </div>

        {/* Tab pills */}
        <div style={{ display: 'flex', background: 'rgba(6,78,59,0.04)', padding: 6, borderRadius: 16, gap: 4, border: `1px solid ${C.border}` }}>
          {(['current', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px 0', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 2, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === tab ? 'white' : 'transparent', color: activeTab === tab ? C.forest : C.muted, boxShadow: activeTab === tab ? '0 2px 8px rgba(6,78,59,0.06)' : 'none' }}>
              {tab === 'current' ? `En cours (${currentOrders.length})` : `Historique (${historyOrders.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AnimatePresence mode="popLayout">
          {displayedOrders.map((order, i) => {
            const st = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ delay: i * 0.04 }}>
                <GlassCard style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
                  {/* Status badge */}
                  <div style={{ position: 'absolute', top: 0, right: 24, background: st.bg, color: st.color, border: `1px solid ${st.border}`, borderTop: 'none', padding: '6px 14px', borderRadius: '0 0 12px 12px', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                    {STATUS_LABELS[order.status] || order.status}
                  </div>

                  {/* Amount */}
                  <div style={{ marginBottom: 20, marginTop: 4 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 2 }}>#{order.id.substring(0, 8)}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
                      <h2 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 900, color: C.text }}>
                        {order.total.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: C.muted }}>FCFA</span>
                      </h2>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: C.muted }}>{order.date}</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  <div style={{ background: 'rgba(6,78,59,0.03)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, border: `1px solid ${C.border}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: C.glass, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={18} color={C.emerald} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, color: C.text, fontSize: '0.85rem', textTransform: 'uppercase' as const }}>{order.customerName}</p>
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{order.location}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <Link href={`/sales/${order.id}`} style={{ flex: 1, background: 'rgba(6,78,59,0.04)', color: C.forest, fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 2, padding: '16px 0', borderRadius: 14, textAlign: 'center' as const, textDecoration: 'none', border: `1px solid ${C.border}`, transition: 'all 0.2s' }}>
                      Inspecter la commande
                    </Link>
                    <div style={{ flexShrink: 0 }}><CallButton phone={order.customerPhone} /></div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
