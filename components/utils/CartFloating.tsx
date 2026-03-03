// components/CartFloatingIcon.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { ShoppingBasket } from 'lucide-react'; // Plus "marché local" que le caddie standard

export default function CartFloatingIcon() {
    const { items } = useCart();
    const [mounted, setMounted] = useState(false);

    // Empêche le mismatch d'hydratation (SSR vs Client)
    useEffect(() => {
        setMounted(true);
    }, []);

    // Calcul du nombre total d'articles
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    // On ne rend rien tant que le composant n'est pas monté ou si le panier est vide
    if (!mounted || totalItems === 0) return null;

    return (
        <Link href="/checkout" style={{ textDecoration: 'none' }}>
            <div 
                className="cart-pulse" // Pour une animation CSS si tu en as une
                style={{
                    position: 'fixed',
                    bottom: '25px',
                    right: '25px',
                    width: '65px',
                    height: '65px',
                    backgroundColor: '#A63C06', // Ocre Terre (ton thème)
                    borderRadius: '20px', // Look "App" moderne au lieu du rond parfait
                    boxShadow: '0 10px 25px rgba(166, 60, 6, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 2000,
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                    e.currentTarget.style.backgroundColor = '#E65100'; // Orange chaud au survol
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.backgroundColor = '#A63C06';
                }}
            >
                {/* Icône Panier (ShoppingBasket fait plus "récolte") */}
                <ShoppingBasket size={30} color="white" strokeWidth={2.2} />

                {/* Badge de compteur stylisé */}
                <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#2E7D32', // Vert "Fraîcheur"
                    color: 'white',
                    borderRadius: '10px',
                    minWidth: '26px',
                    height: '26px',
                    padding: '0 4px',
                    fontSize: '13px',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #FDFCFB', // Rappel du fond de ton site
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                }}>
                    {totalItems}
                </div>

                {/* Petit texte discret pour mobile */}
                <span style={{
                    position: 'absolute',
                    bottom: '-22px',
                    fontSize: '10px',
                    fontWeight: '800',
                    color: '#A63C06',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.5px'
                }}>
                    Commander
                </span>
            </div>
            
            <style jsx>{`
                @keyframes pulse-soft {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                    100% { transform: scale(1); }
                }
                .cart-pulse {
                    animation: pulse-soft 3s infinite ease-in-out;
                }
            `}</style>
        </Link>
    );
}