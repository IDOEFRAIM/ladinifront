'use client';

import { useState } from 'react';
import { normalizeAssetUrl } from '@/lib/assetUrl';
import Image from 'next/image';
import { Product } from '@/features/products/types/product.types';
import { motion } from 'framer-motion';
import { THEME } from '@/features/products/components/view/product-view.theme';
import { IconShieldCheck } from '@/features/products/components/view/ProductIcons';

export function VisualBlock({ product, mainImage, setMainImage }: { product: Product, mainImage: string, setMainImage: (img: string) => void }) {
    const [hasError, setHasError] = useState(false);

  // Si une erreur est survenue, on force l'image de secours
  const imageUrl = hasError || !mainImage
    ? "/images/no_image.webp"
    : (normalizeAssetUrl(mainImage, 'products') ?? "/images/no_image.webp");
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ position: 'relative', borderRadius: '30px', overflow: 'hidden', border: `1px solid ${THEME.border}`, boxShadow: '0 15px 35px rgba(0,0,0,0.05)', height: '550px' }}
            >
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 600px"
                    onError={() => setHasError(true)}
                    style={{ objectFit: 'cover' }}
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
                    <Image
                        key={i}
                        src={normalizeAssetUrl(img, 'products')}
                        alt={`${product.name} ${i + 1}`}
                        width={80}
                        height={80}
                        onClick={() => setMainImage(img)}
                        style={{
                            borderRadius: '15px', objectFit: 'cover', cursor: 'pointer',
                            border: mainImage === img ? `3px solid ${THEME.accent}` : `1px solid ${THEME.border}`,
                            transition: '0.2s'
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
