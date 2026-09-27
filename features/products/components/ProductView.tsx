'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/features/products/types/product.types';
import { useCart } from '@/features/checkout/context/CartContext';
import { THEME } from '@/features/products/components/view/product-view.theme';
import { NavigationBar } from '@/features/products/components/view/ProductNavigationBar';
import { VisualBlock } from '@/features/products/components/view/ProductVisualBlock';
import { AudioMessage } from '@/features/products/components/view/ProductAudioMessage';

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
