'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getMyProducts, deleteProduct } from '@/services/producer.service';
import { Plus, Pencil, Trash2, Share2, Package, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

function GlassCard({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }} {...props}>{children}</div>;
}

function ProductCard({ product, onDelete, onShare }: { product: any; onDelete: (id: string) => void; onShare: (p: any) => void }) {
  console.log(product)
  return (
    <GlassCard style={{ padding: 24, position: 'relative', overflow: 'hidden', transition: 'all 0.3s' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <span style={{ padding: '4px 12px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 1, background: product.quantityForSale > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: product.quantityForSale > 0 ? C.emerald : '#EF4444' }}>
          {product.quantityForSale > 0 ? 'En Vente' : 'Epuise'}
        </span>
      </div>

      <div style={{ height: 160, background: 'rgba(6,78,59,0.03)', borderRadius: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.categoryLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
        ) : (
          <Package size={48} color={C.muted} style={{ opacity: 0.2 }} />
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(6,78,59,0.9)', backdropFilter: 'blur(8px)', color: 'white', padding: '8px 14px', borderRadius: 12 }}>
          <span style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 900 }}>{product.price} <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>FCFA</span></span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>{product.categoryLabel}</h3>
        <p style={{ fontFamily: F.body, fontSize: '0.75rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const }}>Stock: {product.quantityForSale} {product.unit}</p>
        {product.localNames && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' as const }}>
            {Object.entries(product.localNames).map(([lang, name]: any) => (
              <span key={lang} style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(6,78,59,0.04)', color: C.muted, padding: '3px 8px', borderRadius: 8, textTransform: 'uppercase' as const }}>{lang}: {name}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Link href={`/products/${product.id}/edit`} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(6,78,59,0.04)', color: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: `1px solid ${C.border}`, transition: 'all 0.2s' }}><Pencil size={16} /></Link>
        <button onClick={() => onShare(product)} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(16,185,129,0.06)', color: C.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(16,185,129,0.12)`, cursor: 'pointer', transition: 'all 0.2s' }}><Share2 size={16} /></button>
        <button onClick={() => onDelete(product.id)} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(239,68,68,0.06)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.12)', cursor: 'pointer', transition: 'all 0.2s' }}><Trash2 size={16} /></button>
      </div>
    </GlassCard>
  );
}

function EmptyCatalogue() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', border: `2px dashed ${C.border}`, borderRadius: 32, textAlign: 'center' as const }}>
      <Package size={56} color={C.muted} style={{ opacity: 0.15, marginBottom: 16 }} />
      <p style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 2 }}>Catalogue Vide</p>
      <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted, marginTop: 8, marginBottom: 24 }}>Commencez par ajouter votre premier produit</p>
      <Link href="/products/add" style={{ background: C.forest, color: 'white', padding: '14px 28px', borderRadius: 16, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' as const, textDecoration: 'none' }}>Ajouter un produit</Link>
    </div>
  );
}

export default function ProducerCatalogue() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadProducts(); }, [user?.id]);

  const loadProducts = async () => {
    const res = await getMyProducts();
    if (res.success && res.data) setProducts(res.data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce produit du catalogue ?")) return;
    const res = await deleteProduct(id);
    if (res.success) { toast.success("Produit retire"); loadProducts(); }
    else toast.error("Erreur lors de la suppression");
  };

  const handleShare = (product: any) => {
    const text = `Decouvrez mon produit *${product.categoryLabel}* a ${product.price} FCFA sur Vital Engine !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredProducts = products.filter(p => p.categoryLabel.toLowerCase().includes(filter.toLowerCase()));

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={36} color={C.emerald} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.sand, padding: '24px', paddingBottom: 96, fontFamily: F.body }} className="lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between" style={{ gap: 20, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: F.heading, fontSize: '1.75rem', fontWeight: 900, color: C.forest, letterSpacing: '-0.02em' }}>Mon Catalogue</h1>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 2, marginTop: 4 }}>Vos produits en vente</p>
        </div>
        <Link href="/products/add" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: '14px 24px', borderRadius: 16, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' as const, textDecoration: 'none', boxShadow: '0 8px 30px rgba(6,78,59,0.15)' }}>
          <Plus size={18} /> Nouveau Produit
        </Link>
      </div>

      {/* Search */}
      <GlassCard style={{ padding: '6px 6px 6px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420 }}>
        <Search size={18} color={C.muted} />
        <input type="text" placeholder="Rechercher un produit..." value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: F.body, fontWeight: 700, color: C.text, fontSize: '0.85rem', padding: '10px 0' }} />
      </GlassCard>

      {/* Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 20 }}>
          <AnimatePresence>
            {filteredProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <ProductCard product={product} onDelete={handleDelete} onShare={handleShare} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : <EmptyCatalogue />}
    </div>
  );
}
