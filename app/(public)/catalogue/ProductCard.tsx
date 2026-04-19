'use client';

import React from 'react';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import Link from 'next/link';
import { motion } from 'framer-motion';
// Small inline icons to avoid lucide-react file access under OneDrive
function IconMapPin({ size = 14 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 21s8-5.5 8-11a8 8 0 10-16 0c0 5.5 8 11 8 11z" stroke="currentColor" strokeWidth="1" fill="none" />
            <circle cx="12" cy="10" r="2" fill="currentColor" />
        </svg>
    );
}

function IconArrowRight({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M5 12h14M13 5l6 7-6 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
import { Product } from '@/types/product';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

interface ProductCardProps { product: Product; viewMode?: 'grid' | 'list'; }

function ProductImageSection({ product, isOutOfStock }: { product: Product; isOutOfStock: boolean }) {
    return (
        <div style={{ height:220, position:'relative', overflow:'hidden', background:`${C.forest}08` }}>
            <img
                src={product.images && product.images.length > 0 ? normalizeAssetUrl(product.images[0], 'products') : '/placeholder.jpg'}
                alt={product?.name || 'Product picture'}
                style={{ width:'100%', height:'100%', objectFit:'cover', filter: isOutOfStock ? 'grayscale(1)' : 'none' }}
            />
            <div style={{
                position:'absolute', top:15, left:15,
                background: isOutOfStock ? C.muted : C.emerald,
                color:'white', padding:'6px 14px', borderRadius:100,
                fontSize:'0.7rem', fontWeight:800, letterSpacing:0.5, fontFamily:F.body
            }}>
                {isOutOfStock ? 'RUPTURE' : 'DISPONIBLE'}
            </div>
        </div>
    );
}

function ProductPriceSection({ product }: { product: Product }) {
    return (
        <div>
            <span style={{ display:'block', fontSize:'0.7rem', color:C.muted, fontWeight:700, fontFamily:F.body }}>PRIX UNITAIRE</span>
            <span style={{ fontSize:'1.4rem', fontWeight:800, color:C.text, fontFamily:F.heading }}>
                {product.price.toLocaleString('fr-FR')}
                <small style={{ fontSize:'0.8rem', marginLeft:4, color:C.emerald }}> CFA</small>
            </span>
        </div>
    );
}

export default function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
    const p: any = product;
    const available = p.quantityForSale ?? p.stock ?? p.quantity ?? 0;
    const isOutOfStock = available <= 0;

    return (
        <motion.div whileHover={{ y: -6 }} transition={{ type:'spring', stiffness:300 }} style={{ height:'100%' }}>
            <Link
                href={!isOutOfStock ? `/publicProducts/${product.id}` : '#'}
                style={{ textDecoration:'none', color:'inherit', display:'block', height:'100%' }}
                onClick={e => isOutOfStock && e.preventDefault()}
            >
                <div style={{
                    background: C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
                    border:`1px solid ${C.border}`, borderRadius:24, overflow:'hidden',
                    opacity: isOutOfStock ? 0.6 : 1, transition:'box-shadow 0.3s',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    display:'flex', flexDirection:'column', height:'100%', position:'relative',
                    boxShadow:'0 4px 16px rgba(6,78,59,0.05)'
                }}
                onMouseEnter={e => { if (!isOutOfStock) e.currentTarget.style.boxShadow = '0 12px 32px rgba(6,78,59,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(6,78,59,0.05)'; }}
                >
                    <ProductImageSection product={product} isOutOfStock={isOutOfStock} />
                    <div style={{ padding:24, display:'flex', flexDirection:'column', flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4, color:C.forest, marginBottom:12 }}>
                            <IconMapPin size={14} />
                            <span style={{ fontSize:'0.75rem', fontWeight:700, textTransform:'uppercase', fontFamily:F.body }}>
                                {product.producer?.location?.split(',')[0] || 'Région'}
                            </span>
                        </div>
                        <h3 style={{ margin:'0 0 8px', fontSize:'1.3rem', fontWeight:800, color:C.text, lineHeight:1.2, fontFamily:F.heading }}>
                            {product.name}
                        </h3>
                        <p style={{ fontSize:'0.85rem', color:C.muted, marginBottom:20, fontFamily:F.body }}>
                            Catégorie : {product.categoryLabel}
                        </p>
                        <div style={{ marginTop:'auto', paddingTop:16, borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <ProductPriceSection product={product} />
                            <div style={{ width:40, height:40, borderRadius:'50%', background:C.forest, color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <IconArrowRight size={20} />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
