import React from 'react';
import Link from 'next/link';
import { getProductById } from '@/services/catalogue.service';
import { Product } from '@/types/product';
import ProductClientView from './ProductView';

function IconAlertTriangle({ size = 40, color = '#E65100' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M10.29 3.86L1.82 18A2 2 0 003.53 21h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M12 9v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill={color} />
        </svg>
    );
}

function IconArrowLeft({ size = 18, color = 'white' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 18L9 12l6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconLifeBuoy({ size = 18, color = '#2D3436' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
            <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.5" fill="none" />
            <path d="M5.3 5.3l3.5 3.5M18.7 5.3l-3.5 3.5M5.3 18.7l3.5-3.5M18.7 18.7l-3.5-3.5" stroke={color} strokeWidth="1.5" />
        </svg>
    );
}

const THEME = {
    ocre: '#E65100',
    sand: '#FDFCFB',
    surface: '#FFFFFF',
    textMain: '#2D3436',
    textSub: '#7F8C8D',
    border: '#EEEAE5',
};

interface ProductDetailPageProps {
    params: Promise<{ id: string }>; 
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
    // 1. Extraction de l'ID (Next.js 15)
    const { id } = await params;

    let product: Product | null = null;
    let errorMessage: string | null = null;

    try {
        // 2. Récupération des données via le service
        // Le service gère déjà l'URL absolue pour le serveur
        product = await getProductById(id);
        if (!product) {
            errorMessage = 'Ce lot de production n’est plus disponible ou n’existe pas.';
        }
    } catch (err) {
        console.error("Erreur de récupération:", err);
        errorMessage = 'Erreur lors de la synchronisation avec le réservoir de données.';
    }

    // --- ÉCRAN D'ERREUR ---
    if (errorMessage || !product) {
        return (
            <div style={{ 
                minHeight: '100vh', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', padding: '24px', backgroundColor: THEME.sand 
            }}>
                <div style={{ 
                    maxWidth: '500px', width: '100%', padding: '48px 40px', 
                    borderRadius: '32px', backgroundColor: THEME.surface, textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.04)', border: `1px solid ${THEME.border}`,
                    fontFamily: 'inherit'
                }}>
                    <div style={{ 
                        width: '80px', height: '80px', backgroundColor: '#FFF3E0', 
                        borderRadius: '24px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', margin: '0 auto 24px', color: THEME.ocre
                    }}>
                        <IconAlertTriangle size={40} color={THEME.ocre} />
                    </div>

                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: THEME.textMain, margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>
                        Stock introuvable
                    </h1>
                    
                    <p style={{ color: THEME.textSub, lineHeight: '1.6', marginBottom: '32px' }}>
                        L'identifiant <span style={{ color: THEME.textMain, fontWeight: '700' }}>{id.slice(0, 8)}</span> ne correspond à aucun stock actif. 
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Link href="/catalogue" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            padding: '18px', backgroundColor: THEME.ocre, color: 'white',
                            textDecoration: 'none', fontWeight: '800', borderRadius: '16px', fontSize: '0.95rem'
                        }}>
                            <IconArrowLeft size={18} color="white" /> Retour au catalogue
                        </Link>

                        <Link href="/contact" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                            padding: '16px', backgroundColor: 'transparent', color: THEME.textMain,
                            textDecoration: 'none', fontWeight: '700', borderRadius: '16px',
                            border: `1px solid ${THEME.border}`, fontSize: '0.9rem'
                        }}>
                            <IconLifeBuoy size={18} color={THEME.textMain} /> Aide technique
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- VUE PRODUIT ---
    return (
        <main style={{ backgroundColor: THEME.sand, minHeight: '100vh' }}>
            {/* On passe directement le produit au composant client */}
            <ProductClientView product={product} />
        </main>
    );
}