'use client';

import React, { useState, useEffect, useCallback,useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getMyProducts, deleteProduct } from '@/services/producer.service';
import { C, F, GlassCard } from '@/components/productor/tokens';
import { Plus, Pencil, Trash2, Share2, Package, Search, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Interface stricte pour typer vos produits et sécuriser le catalogue
interface Product {
  id: string;
  categoryLabel: string;
  price: number;
  quantityForSale: number;
  unit: string;
  images?: string[];
  localNames?: Record<string, string>;
}

interface ProductCardProps {
  product: Product;
  onDelete: (id: string) => Promise<void>;
  onShare: (product: Product) => void;
}

function ProductCard({ product, onDelete, onShare }: ProductCardProps) {
  const isAvailable = product.quantityForSale > 0;

  return (
    <GlassCard style={{ padding: 24, position: 'relative', overflow: 'hidden', height: '100%' }}>
      {/* Badge Disponibilité */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <span style={{ 
          padding: '4px 12px', 
          borderRadius: 10, 
          fontSize: '0.6rem', 
          fontWeight: 800, 
          textTransform: 'uppercase', 
          letterSpacing: 1, 
          background: isAvailable ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
          color: isAvailable ? C.emerald : '#EF4444' 
        }}>
          {isAvailable ? 'En Vente' : 'Épuisé'}
        </span>
      </div>

      {/* Conteneur Image & Prix */}
      <div style={{ height: 160, background: 'rgba(6,78,59,0.03)', borderRadius: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        {product.images && product.images.length > 0 ? (
          <img src={product.images[0]} alt={product.categoryLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} loading="lazy" />
        ) : (
          <Package size={48} color={C.muted} style={{ opacity: 0.2 }} />
        )}
        <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(6,78,59,0.9)', backdropFilter: 'blur(8px)', color: 'white', padding: '8px 14px', borderRadius: 12 }}>
          <span style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 900 }}>
            {product.price.toLocaleString()} <span style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 500 }}>FCFA</span>
          </span>
        </div>
      </div>

      {/* Informations Textuelles */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>{product.categoryLabel}</h3>
        <p style={{ fontFamily: F.body, fontSize: '0.75rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>
          Stock: {product.quantityForSale} {product.unit}
        </p>
        
        {product.localNames && Object.keys(product.localNames).length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {Object.entries(product.localNames).map(([lang, name]) => (
              <span key={lang} style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(6,78,59,0.04)', color: C.muted, padding: '3px 8px', borderRadius: 8, textTransform: 'uppercase' }}>
                {lang}: {name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Grille d'actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Link href={`/products/${product.id}/edit`} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(6,78,59,0.04)', color: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: `1px solid ${C.border}`, transition: 'background 0.2s' }} className="hover:bg-emerald-50 active:scale-95 transition-transform">
          <Pencil size={16} />
        </Link>
        <button onClick={() => onShare(product)} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(16,185,129,0.06)', color: C.emerald, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(16,185,129,0.12)`, cursor: 'pointer' }} className="hover:bg-green-100/50 active:scale-95 transition-transform">
          <Share2 size={16} />
        </button>
        <button onClick={() => onDelete(product.id)} style={{ padding: '12px 0', borderRadius: 12, background: 'rgba(239,68,68,0.06)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,0.12)', cursor: 'pointer' }} className="hover:bg-red-100/50 active:scale-95 transition-transform">
          <Trash2 size={16} />
        </button>
      </div>
    </GlassCard>
  );
}

function EmptyCatalogue() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', border: `2px dashed ${C.border}`, borderRadius: 32, textAlign: 'center' }}>
      <Package size={56} color={C.muted} style={{ opacity: 0.15, marginBottom: 16 }} />
      <p style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 2 }}>Catalogue Vide</p>
      <p style={{ fontFamily: F.body, fontSize: '0.8rem', color: C.muted, marginTop: 8, marginBottom: 24 }}>Commencez par ajouter votre premier produit</p>
      <Link href="/products/add" style={{ background: C.forest, color: 'white', padding: '14px 28px', borderRadius: 16, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textDecoration: 'none' }} className="shadow-md hover:opacity-90 active:scale-95 transition-all">
        Ajouter un produit
      </Link>
    </div>
  );
}

export default function ProducerCatalogue() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');

  const loadProducts = useCallback(async () => {
    try {
      const res = await getMyProducts();
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (error) {
      toast.error("Impossible de charger vos produits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadProducts(); 
  }, [loadProducts]);

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce produit du catalogue ?")) return;
    try {
      const res = await deleteProduct(id);
      if (res.success) { 
        toast.success("Produit retiré"); 
        // Mise à jour optimiste locale pour une réactivité instantanée avant rafraîchissement global
        setProducts((prev) => prev.filter(p => p.id !== id));
        loadProducts(); 
      } else {
        toast.error("Erreur lors de la suppression");
      }
    } catch (err) {
      toast.error("Une erreur réseau est survenue");
    }
  };

  const handleShare = (product: Product) => {
    const text = `Découvrez mon produit *${product.categoryLabel}* à ${product.price} FCFA sur Vital Engine !`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Mémoïsation du filtrage pour éviter de recalculer à chaque re-render inutile
  const filteredProducts = useMemo(() => {
    return products.filter(p => p.categoryLabel.toLowerCase().includes(filter.toLowerCase()));
  }, [products, filter]);

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
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>Vos produits en vente</p>
        </div>
        <Link href="/products/add" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', padding: '14px 24px', borderRadius: 16, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textDecoration: 'none', boxShadow: '0 8px 30px rgba(6,78,59,0.15)' }} className="hover:opacity-95 active:scale-95 transition-all">
          <Plus size={18} /> Nouveau Produit
        </Link>
      </div>

      {/* Search Input */}
      <GlassCard style={{ padding: '6px 6px 6px 16px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420 }}>
        <Search size={18} color={C.muted} />
        <input 
          type="text" 
          placeholder="Rechercher un produit..." 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: F.body, fontWeight: 700, color: C.text, fontSize: '0.85rem', padding: '10px 0' }} 
        />
      </GlassCard>

      {/* Grid Animée */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3" style={{ gap: 20 }}>
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id} 
                layout // Anime la réorganisation spatiale fluide de la grille lors d'un filtrage/suppression
                initial={{ opacity: 0, scale: 0.92 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                <ProductCard product={product} onDelete={handleDelete} onShare={handleShare} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : <EmptyCatalogue />}
    </div>
  );
}