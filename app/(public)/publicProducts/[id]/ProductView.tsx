"use client";

import React, { useState, useEffect } from 'react';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { useCart } from '@/context/CartContext';
// Inline SVG icons to avoid reading files from node_modules under OneDrive
import { motion } from 'framer-motion';

const THEME = {
    bg: '#FDFCFB',
    surface: '#FFFFFF',
    accent: '#E65100',
    secondary: '#2D3436',
    muted: '#7F8C8D',
    border: '#EEEAE5',
    active: '#FFF3E0'
};

function IconArrowLeft({ size = 16, color = THEME.accent }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 18L9 12l6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconShieldCheck({ size = 16, color = THEME.accent }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M9 12l2 2 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconChevronRight({ size = 14, color = THEME.muted }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconVolume2({ size = 20, color = 'white' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
            <path d="M19 9a4 4 0 010 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconVolumeX({ size = 20, color = 'white' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M11 5L6 9H2v6h4l5 4V5z" fill={color} />
            <path d="M19 9l-4 4m0-4l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// --- SOUS-COMPOSANTS ---

function NavigationBar({ product, router }: { product: Product, router: any }) {
    return (
        <nav style={{ borderBottom: `1px solid ${THEME.border}`, padding: '20px 5%', backgroundColor: THEME.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 600 }}>
                    <button 
                    onClick={() => router.back()}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: THEME.accent }}
                >
                    <IconArrowLeft size={16} /> RETOUR
                </button>
                <span style={{ color: THEME.border }}>|</span>
                <span style={{ color: THEME.muted }}>MARCHÉ</span>
                <IconChevronRight size={14} color={THEME.muted} />
                <span style={{ color: THEME.muted }}>{product.categoryLabel?.toUpperCase()}</span>
                <IconChevronRight size={14} color={THEME.muted} />
                <span style={{ color: THEME.secondary }}>{product.name}</span>
            </div>
        </nav>
    );
}

function VisualBlock({ product, mainImage, setMainImage }: { product: Product, mainImage: string, setMainImage: (img: string) => void }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', border: `1px solid ${THEME.border}`, boxShadow: '0 15px 35px rgba(0,0,0,0.05)' }}
            >
                <img 
                    src={normalizeAssetUrl(mainImage, 'products')} 
                    alt={product.name}
                    style={{ width: '100%', height: '550px', objectFit: 'cover' }}
                />
                <div style={{ 
                    position: 'absolute', top: '20px', left: '20px',
                    backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 18px',
                    borderRadius: '15px', border: `1px solid ${THEME.border}`,
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700
                }}>
                    <IconShieldCheck size={16} color={THEME.accent} />
                    ORIGINE CERTIFIÉE : {product.producer?.location?.split(',')[0].toUpperCase() || 'BURKINA FASO'}
                </div>
            </motion.div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {product.images?.map((img, i) => (
                    <img 
                        key={i}
                        src={normalizeAssetUrl(img, 'products')}
                        onClick={() => setMainImage(img)}
                        style={{ 
                            width: '80px', height: '80px', borderRadius: '15px', objectFit: 'cover', cursor: 'pointer',
                            border: mainImage === img ? `3px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                            transition: '0.2s'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function AudioMessage({ product, isPlaying, setIsPlaying, audio, setAudio }: any) {
    if (!product.audioUrl) {
        return (
            <div style={{
                padding: '20px',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: `1px dashed ${THEME.border}`,
                color: THEME.muted,
                fontSize: '0.9rem',
                fontWeight: 600
            }}>
                Audio non disponible pour ce produit.
            </div>
        );
    }

    const toggleAudio = () => {
        if (!audio) {
            const newAudio = new Audio(`/uploads/audio/${product.audioUrl}`);
            setAudio(newAudio);
            newAudio.play();
            setIsPlaying(true);
            newAudio.onended = () => setIsPlaying(false);
        } else {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div style={{ 
            padding: '24px', backgroundColor: THEME.active, borderRadius: '24px', 
            display: 'flex', alignItems: 'center', gap: '20px', border: `1px solid ${THEME.accent}33`
        }}>
            <div style={{ 
                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: THEME.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
                {isPlaying ? <IconVolume2 /> : <IconVolumeX />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: THEME.accent }}>MESSAGE DU PRODUCTEUR</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    {product.producer?.name || 'Producteur inconnu'}
                </div>
            </div>
            <button onClick={toggleAudio} style={{ 
                backgroundColor: THEME.secondary, color: 'white', border: 'none', 
                padding: '10px 20px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' 
            }}>
                {isPlaying ? 'PAUSE' : 'ÉCOUTER'}
            </button>
        </div>
    );
}

// --- COMPOSANT PRINCIPAL ---

export default function ProductClientView({ product }: { product: Product }) {
    const router = useRouter();
    const { addToCart } = useCart();
    
    // États
    const [quantity, setQuantity] = useState(1);
    const [mainImage, setMainImage] = useState(product?.images?.[0] || '');
    const [isPlaying, setIsPlaying] = useState(false);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    // Calculs (On évite le type 'any' en utilisant les options de secours)
    const available = (product as any).quantityForSale ?? (product as any).stock ?? 0;
    const unitPrice = product.price || 0;
    const totalPrice = unitPrice * quantity;

    // Sécurité : Nettoyage de l'audio si on quitte la page
    useEffect(() => {
        return () => {
            if (audio) {
                audio.pause();
                audio.src = "";
            }
        };
    }, [audio]);

    const handleAddToCart = () => {
        if (quantity > 0 && quantity <= available) {
            addToCart(product, quantity);
            router.push('/checkout');
        }
    };

    return (
        <div style={{ backgroundColor: THEME.bg, color: THEME.secondary, minHeight: '100vh', fontFamily: 'inherit' }}>
            <NavigationBar product={product} router={router} />
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                maxWidth: '1300px', margin: '0 auto', gap: '50px', padding: '40px 5%' 
            }}>
                
                {/* Colonne Gauche : Visuels */}
                <VisualBlock product={product} mainImage={mainImage} setMainImage={setMainImage} />

                {/* Colonne Droite : Infos & Achat */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '10px', lineHeight: 1 }}>
                            {product.name}
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 800 }}>{unitPrice.toLocaleString()}</span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: THEME.accent }}>CFA / {product.unit}</span>
                        </div>
                    </div>

                    <AudioMessage 
                        product={product} 
                        isPlaying={isPlaying} 
                        setIsPlaying={setIsPlaying} 
                        audio={audio} 
                        setAudio={setAudio} 
                    />

                    <p style={{ color: THEME.muted, lineHeight: '1.6' }}>
                        {product.description || "Aucune description fournie."}
                    </p>

                    {/* Bloc Transaction Rapide */}
                    <div style={{ padding: '30px', borderRadius: '24px', backgroundColor: 'white', border: `1px solid ${THEME.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>QUANTITÉ</span>
                            <span style={{ color: available > 0 ? '#10B981' : THEME.accent, fontWeight: 800, fontSize: '0.8rem' }}>
                                {available > 0 ? `EN STOCK: ${available}` : 'RUPTURE'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <input
                                type="number"
                                min="1"
                                max={available}
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                style={{ 
                                    width: '80px', padding: '12px', borderRadius: '12px', 
                                    border: `1px solid ${THEME.border}`, fontWeight: 800, fontSize: '1.2rem' 
                                }}
                            />
                            <button
                                onClick={handleAddToCart}
                                disabled={available === 0}
                                style={{
                                    flex: 1, padding: '15px', borderRadius: '12px',
                                    backgroundColor: available > 0 ? THEME.accent : THEME.muted,
                                    color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer'
                                }}
                            >
                                RÉSERVER {totalPrice.toLocaleString()} CFA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}