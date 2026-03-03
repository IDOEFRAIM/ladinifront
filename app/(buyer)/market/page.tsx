'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from '@/components/Market/ProductCard';
import FilterSidebar from '@/components/Market/FilterSidebar';
import { ProductRepository } from '@/services/repository';
import { Product } from '@/types/market';
import { motion } from 'framer-motion';
import { ShoppingBag, Loader2, AlertTriangle, RotateCcw, Search } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

export default function MarketPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<{ category: string; minPrice: number }>({ category: '', minPrice: 0 });

  useEffect(() => {
    const fetchProducts = async () => {
      try { setLoading(true); setError(null); const data = await ProductRepository.getAllProducts(); setProducts(data); setFilteredProducts(data); }
      catch (err: any) { console.error("Erreur catalogue:", err); setError("Impossible de charger les produits."); }
      finally { setLoading(false); }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    let results = [...products];
    if (currentFilters.category) results = results.filter(p => p.categoryLabel === currentFilters.category);
    if (currentFilters.minPrice > 0) results = results.filter(p => Number(p.price) >= currentFilters.minPrice);
    setFilteredProducts(results);
  }, [products, currentFilters]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={40} color={C.emerald} className="animate-spin" style={{ marginBottom: 16 }} />
      <p style={{ fontFamily: F.body, color: C.muted, fontWeight: 600 }}>Chargement du Catalogue...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: C.sand }}>
      <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', padding: 32, borderRadius: 24, textAlign: 'center' as const, maxWidth: 400 }}>
        <AlertTriangle size={40} color="#EF4444" style={{ marginBottom: 12 }} />
        <p style={{ fontFamily: F.body, color: C.text, fontWeight: 600 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: '12px 28px', borderRadius: 100, border: 'none', fontFamily: F.body, fontWeight: 700, cursor: 'pointer' }}>
          <RotateCcw size={16} /> Reessayer
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.sand }}>
      <FilterSidebar onFilterChange={setCurrentFilters} />

      <main style={{ flex: 1, padding: '24px' }} className="md:p-8">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} color="white" />
            </div>
            <h1 style={{ fontFamily: F.heading, fontSize: '1.6rem', fontWeight: 800, color: C.forest, margin: 0 }}>Le Marche FrontAg</h1>
          </div>
          <p style={{ fontFamily: F.body, color: C.muted, fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 800, color: C.emerald }}>{filteredProducts.length}</span> produits disponibles
            {currentFilters.category && ` dans ${currentFilters.category}`}
          </p>
        </motion.header>

        {filteredProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' as const, marginTop: 80 }}>
            <Search size={48} color={C.muted} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p style={{ fontFamily: F.heading, fontSize: '1.1rem', color: C.muted }}>Aucun produit ne correspond a vos criteres.</p>
            <button onClick={() => setCurrentFilters({ category: '', minPrice: 0 })} style={{ marginTop: 12, background: 'none', border: 'none', color: C.emerald, fontFamily: F.body, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
              Reinitialiser les filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" style={{ gap: 20 }}>
            {filteredProducts.map((product, idx) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
