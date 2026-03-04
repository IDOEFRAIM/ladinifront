'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, UserPlus, Package, Search, Filter, Loader2, ArrowRight, XCircle, Clock } from 'lucide-react';
import { getAdminValidations, updateProducerStatus } from '@/services/admin.service';

const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type ValidationItem = { id: string; type: 'PRODUCER' | 'PRODUCT'; name: string; details: string; date: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' };
type TabKey = 'all' | 'PRODUCER' | 'PRODUCT';

function GlassCard({ children, style, hover = true, ...props }: any) {
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, transition: 'box-shadow 0.3s, transform 0.3s', ...style }} {...props}
      onMouseEnter={hover ? (e: any) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,78,59,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; } : undefined}
      onMouseLeave={hover ? (e: any) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; } : undefined}
    >{children}</div>
  );
}

export default function AdminValidationsPage() {
  const [items, setItems] = useState<ValidationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const res = await getAdminValidations();
    if (res.success && res.data) setItems(res.data.map((d: any) => ({ id: d.id, type: d.type === 'producer' ? 'PRODUCER' : 'PRODUCT', name: d.title, details: d.producerName || '', date: new Date(d.submissionDate).toLocaleDateString('fr-FR'), status: 'PENDING' })) as ValidationItem[]);
    setLoading(false);
  }

  async function handleValidate(id: string) {
    try { await updateProducerStatus(id, 'ACTIVE'); loadData(); } catch {}
  }
  async function handleReject(id: string) {
    try { await updateProducerStatus(id, 'SUSPENDED'); loadData(); } catch {}
  }

  const filtered = items.filter(i => {
    if (activeTab !== 'all' && i.type !== activeTab) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <Filter size={14} /> },
    { key: 'PRODUCER', label: 'Producteurs', icon: <UserPlus size={14} /> },
    { key: 'PRODUCT', label: 'Produits', icon: <Package size={14} /> },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '20px 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>File de Validation</h1>
              <p style={{ fontSize: 13, color: C.muted, fontFamily: F.body }}>{items.length} éléments en attente de revue</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} color={C.muted} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: 100, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, background: 'rgba(6,78,59,0.04)', borderRadius: 100, padding: 4 }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 100, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: F.body, transition: 'all 0.2s',
                    background: activeTab === t.key ? C.forest : 'transparent', color: activeTab === t.key ? 'white' : C.muted }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <AnimatePresence>
            {filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ delay: i * 0.04 }}>
                <GlassCard style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
                  {/* Icon */}
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: item.type === 'PRODUCER' ? 'rgba(16,185,129,0.1)' : 'rgba(217,119,6,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.type === 'PRODUCER' ? C.emerald : C.amber, flexShrink: 0 }}>
                    {item.type === 'PRODUCER' ? <UserPlus size={22} /> : <Package size={22} />}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, fontFamily: F.body }}>{item.type === 'PRODUCER' ? 'Producteur' : 'Produit'}</span>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.border }} />
                      <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {item.date}</span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: C.forest, fontFamily: F.heading }}>{item.name}</h3>
                    <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{item.details}</p>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleReject(item.id)}
                      style={{ padding: '10px 20px', borderRadius: 100, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: F.body }}>
                      <XCircle size={16} /> Rejeter
                    </button>
                    <button onClick={() => handleValidate(item.id)}
                      style={{ padding: '10px 24px', borderRadius: 100, border: 'none', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', fontFamily: F.body, boxShadow: '0 4px 12px rgba(6,78,59,0.2)' }}>
                      <CheckCircle size={16} /> Valider
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80, color: C.muted }}>
              <CheckCircle size={48} color={C.emerald} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ fontSize: 16, fontWeight: 600, fontFamily: F.body }}>Aucun élément en attente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
