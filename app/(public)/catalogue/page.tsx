'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, SlidersHorizontal, Grid3X3, List, Leaf, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProducts, getCategories, getRegions, Category } from '@/services/catalogue.service';
import ProductCard from './ProductCard';
import UnifiedFilter from './filter';

/*  Tokens  */
const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

/*  Glassmorphism card  */
const GlassCard = ({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div style={{ background: C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:24, border:`1px solid ${C.border}`, ...style }} {...props}>{children}</div>
);

/*  Sub-components  */
const CatalogueHeader = () => (
  <div style={{ textAlign:'center', padding:'48px 20px 32px' }}>
    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:`${C.emerald}14`, borderRadius:100, padding:'8px 20px', marginBottom:20 }}>
      <Leaf size={16} color={C.emerald} />
      <span style={{ fontFamily:F.body, fontSize:'0.8rem', fontWeight:700, color:C.forest, letterSpacing:0.5 }}>CATALOGUE VIVANT</span>
    </div>
    <h1 style={{ fontFamily:F.heading, fontSize:'clamp(2rem,5vw,3rem)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:0 }}>
      Produits du terroir
    </h1>
    <p style={{ fontFamily:F.body, color:C.muted, fontSize:'1.05rem', marginTop:12, maxWidth:520, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
      Découvrez les meilleurs produits agricoles directement des producteurs certifiés du Burkina Faso.
    </p>
  </div>
);

const CatalogueSidebar = ({ categories, regions, activeCategory, activeRegion, onFilterChange, onReset }: any) => (
  <aside className="hidden lg:block" style={{ width:280, flexShrink:0 }}>
    <UnifiedFilter categories={categories} regions={regions} activeCategory={activeCategory} activeRegion={activeRegion} onFilterChange={onFilterChange} onReset={onReset} />
  </aside>
);

const CatalogToolbar = ({ search, setSearch, viewMode, setViewMode, totalProducts, showMobileFilter, setShowMobileFilter }: any) => (
  <GlassCard style={{ padding:'16px 24px', marginBottom:24, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
    <div style={{ flex:1, minWidth:200, position:'relative' }}>
      <Search size={18} color={C.muted} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)' }} />
      <input
        type="text" value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher un produit..."
        style={{ width:'100%', padding:'12px 12px 12px 42px', borderRadius:14, border:`1px solid ${C.border}`, background:'white', fontFamily:F.body, fontSize:'0.9rem', outline:'none', color:C.text }}
      />
    </div>
    <div style={{ display:'flex', gap:8 }}>
      <span style={{ fontFamily:F.body, fontSize:'0.82rem', color:C.muted, fontWeight:600, alignSelf:'center', marginRight:8 }}>{totalProducts} produits</span>
      {(['grid','list'] as const).map(m => (
        <button key={m} onClick={() => setViewMode(m)} style={{ padding:10, borderRadius:12, border:`1px solid ${viewMode === m ? C.forest : C.border}`, background: viewMode === m ? `${C.forest}0D` : 'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: viewMode === m ? C.forest : C.muted }}>
          {m === 'grid' ? <Grid3X3 size={18}/> : <List size={18}/>}
        </button>
      ))}
      <button className="lg:hidden" onClick={() => setShowMobileFilter(true)} style={{ padding:10, borderRadius:12, border:`1px solid ${C.border}`, background:'white', cursor:'pointer', display:'flex', alignItems:'center', color:C.muted }}>
        <SlidersHorizontal size={18}/>
      </button>
    </div>
  </GlassCard>
);

const EmptyState = () => (
  <GlassCard style={{ padding:64, textAlign:'center' }}>
    <Leaf size={48} color={C.emerald} style={{ margin:'0 auto 20px', opacity:0.5 }} />
    <h3 style={{ fontFamily:F.heading, fontWeight:700, color:C.text, marginBottom:8 }}>Aucun résultat</h3>
    <p style={{ fontFamily:F.body, color:C.muted, fontSize:'0.9rem' }}>Essayez d'ajuster vos filtres ou votre recherche.</p>
  </GlassCard>
);

const LoadingState = () => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80 }}>
    <Loader2 size={36} color={C.emerald} style={{ animation:'spin 1s linear infinite' }} />
    <p style={{ fontFamily:F.body, color:C.muted, marginTop:16, fontWeight:600 }}>Chargement du catalogue...</p>
    <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
  </div>
);

/*  Main  */
export default function CataloguePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<{id:string;name:string}[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeRegion, setActiveRegion] = useState('all');
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeRegion !== 'all') params.region = activeRegion;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const data = await getProducts(params);
      setProducts(data);
    } catch { setProducts([]); }
    setLoading(false);
  }, [activeCategory, activeRegion, debouncedSearch]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    (async () => {
      try { const [cats, regs] = await Promise.all([getCategories(), getRegions()]); setCategories(cats); setRegions(regs); } catch {}
    })();
  }, []);

  const handleFilterChange = (type: 'category'|'region', value: string) => {
    if (type === 'category') setActiveCategory(prev => (prev === value ? 'all' : value));
    else setActiveRegion(prev => (prev === value ? 'all' : value));
  };
  const handleReset = () => { setActiveCategory('all'); setActiveRegion('all'); setSearch(''); };

  return (
    <div style={{ minHeight:'100vh', background:C.sand, fontFamily:F.body }}>
      <CatalogueHeader />
      <div style={{ maxWidth:1360, margin:'0 auto', padding:'0 24px 80px', display:'flex', gap:32 }}>
        <CatalogueSidebar categories={categories} regions={regions} activeCategory={activeCategory} activeRegion={activeRegion} onFilterChange={handleFilterChange} onReset={handleReset} />
        <main style={{ flex:1, minWidth:0 }}>
          <CatalogToolbar search={search} setSearch={setSearch} viewMode={viewMode} setViewMode={setViewMode} totalProducts={products.length} showMobileFilter={showMobileFilter} setShowMobileFilter={setShowMobileFilter} />
          {loading ? <LoadingState /> : products.length === 0 ? <EmptyState /> : (
            <div style={{ display:'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(300px,1fr))' : '1fr', gap:24 }}>
              <AnimatePresence>
                {products.map((p:any) => (
                  <motion.div key={p.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:0.3}}>
                    <ProductCard product={p} viewMode={viewMode} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Mobile filter overlay */}
      <AnimatePresence>
        {showMobileFilter && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }} onClick={() => setShowMobileFilter(false)}>
            <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:30}} style={{ position:'absolute', right:0, top:0, bottom:0, width:'85%', maxWidth:360, background:C.sand, padding:24, overflowY:'auto' }} onClick={e => e.stopPropagation()}>
              <UnifiedFilter categories={categories} regions={regions} activeCategory={activeCategory} activeRegion={activeRegion} onFilterChange={handleFilterChange} onReset={handleReset} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
