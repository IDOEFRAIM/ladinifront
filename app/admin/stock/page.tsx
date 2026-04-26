'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Package, AlertTriangle, ArrowRight, User, Loader2 } from 'lucide-react';
import { getAdminProducts } from '@/services/admin.service';
import Link from 'next/link';
const C = { forest: '#064E3B', emerald: '#10B981', lime: '#84CC16', amber: '#D97706', sand: '#F9FBF8', glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937' };
const F = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" };

type AdminProduct = { id: string; shortCode: string | null; name: string; categoryLabel: string; price: number; unit: string; quantityForSale: number; producerName: string; location: string; totalOrders: number; createdAt: string; updatedAt: string; };

function GlassCard({ children, style }: any) {
  return (
    <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, transition: 'box-shadow 0.3s, transform 0.2s', ...style }}
      onMouseEnter={(e: any) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,78,59,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e: any) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, color, isAlert = false }: any) {
  return (
    <GlassCard style={{ padding: 28 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontFamily: F.body }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: F.heading, letterSpacing: '-0.02em', animation: isAlert ? 'pulse 2s infinite' : 'none' }}>{value}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>{unit}</span>
      </div>
    </GlassCard>
  );
}

function ProductItem({ product, index }: { product: AdminProduct; index: number }) {
  const isOut = product.quantityForSale === 0;
  const isLow = product.quantityForSale > 0 && product.quantityForSale <= 10;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
      <GlassCard style={{ padding: 28 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isOut ? 'rgba(239,68,68,0.08)' : isLow ? 'rgba(217,119,6,0.08)' : `rgba(6,78,59,0.06)`,
              color: isOut ? '#EF4444' : isLow ? C.amber : C.forest }}>
              {isOut ? <AlertTriangle size={22} /> : <Package size={22} />}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{product.shortCode || product.id.slice(0, 8)}</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: C.forest, fontFamily: F.heading }}>
                <Link href={`/admin/stock/${product.id}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                  {product.name}
                </Link>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {product.producerName}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.forest, background: 'rgba(16,185,129,0.08)', padding: '2px 10px', borderRadius: 100 }}>{product.location}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40 }}>
            <DataPoint label="Stock" value={product.quantityForSale} unit={product.unit} highlight={isOut ? '#EF4444' : isLow ? C.amber : C.forest} />
            <DataPoint label="Prix" value={product.price.toLocaleString()} unit="FCFA" />
            <DataPoint label="Ventes" value={product.totalOrders} unit="" />
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function DataPoint({ label, value, unit, highlight = C.forest }: any) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: highlight, fontFamily: F.heading }}>
        {value} <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.5, textTransform: 'uppercase' }}>{unit}</span>
      </p>
    </div>
  );
}

export default function StockPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    const result = await getAdminProducts();
    if (result.success && 'data' in result && result.data) setProducts(result.data as AdminProduct[]);
    setLoading(false);
  }

  const { filtered, totalValue, outOfStockCount } = useMemo(() => {
    const filteredList = products.filter(p => {
      const matchesSearch = !search || [p.name, p.producerName, p.shortCode || ''].some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filter === 'all' || (filter === 'inStock' && p.quantityForSale > 10) || (filter === 'lowStock' && p.quantityForSale > 0 && p.quantityForSale <= 10) || (filter === 'outOfStock' && p.quantityForSale === 0);
      return matchesSearch && matchesFilter;
    });
    return { filtered: filteredList, totalValue: products.reduce((acc, p) => acc + (p.price * p.quantityForSale), 0), outOfStockCount: products.filter(p => p.quantityForSale === 0).length };
  }, [products, search, filter]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={32} color={C.forest} style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const tabs = [{ key: 'all', label: 'Tous' }, { key: 'inStock', label: 'En stock' }, { key: 'lowStock', label: 'Stock bas' }, { key: 'outOfStock', label: 'Rupture' }];

  return (
    <div style={{ minHeight: '100vh', background: C.sand, padding: '32px 24px 120px', fontFamily: F.body }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 40 }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.emerald, boxShadow: `0 0 8px ${C.emerald}` }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.emerald, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Catalogue National</span>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: C.forest, fontFamily: F.heading, letterSpacing: '-0.03em' }}>Stock Hub</h1>
          </motion.div>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <input type="text" placeholder="Recherche..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '14px 48px 14px 20px', borderRadius: 100, border: `1px solid ${C.border}`, background: C.glass, backdropFilter: 'blur(12px)', fontSize: 14, fontFamily: F.body, outline: 'none' }} />
            <Search size={16} color={C.muted} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 20, marginBottom: 40 }}>
          <StatCard label="Valeur Totale" value={formatCFA(totalValue)} unit="FCFA" color={C.forest} />
          <StatCard label="Ruptures" value={outOfStockCount.toString().padStart(2, '0')} unit="Produits" color="#EF4444" isAlert={outOfStockCount > 0} />
          <StatCard label="Total Références" value={products.length.toString()} unit="Produits" color={C.emerald} />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              style={{ padding: '10px 24px', borderRadius: 100, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontFamily: F.body, whiteSpace: 'nowrap',
                background: filter === t.key ? C.forest : C.glass, color: filter === t.key ? 'white' : C.muted, backdropFilter: 'blur(12px)', boxShadow: filter === t.key ? `0 4px 16px rgba(6,78,59,0.2)` : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Products */}
        <div style={{ display: 'grid', gap: 16 }}>
          <AnimatePresence>
            {filtered.map((product, index) => <ProductItem key={product.id} product={product} index={index} />)}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, background: C.glass, borderRadius: 24, border: `2px dashed ${C.border}` }}>
              <Search size={40} color={C.border} style={{ margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600, color: C.muted }}>Aucun produit trouvé.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCFA(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}
