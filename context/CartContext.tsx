'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { Product } from '@/types/market';

const LOCAL_STORAGE_KEY = 'agriConnectCart'; 

export interface CartItem extends Product {
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity: number) => void;
    removeFromCart: (id: string, removeAll?: boolean) => void;
    clearCart: () => void;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getInitialState = (): CartItem[] => {
    if (typeof window === 'undefined') return [];

    try {
        const storedItems = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedItems) {
            const trimmedStore = storedItems.trim(); 
            if (trimmedStore.length > 0) {
                return JSON.parse(trimmedStore) as CartItem[];
            }
        }
    } catch (e) {
        console.error("Erreur chargement panier:", e);
    }
    return [];
};

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>(getInitialState);

    // Sauvegarde automatique dans le localStorage
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    }, [items]);
    
    // --- ACTIONS MÉMOÏSÉES (Correction de la boucle infinie) ---

    const addToCart = useCallback((product: Product, quantity: number) => {
        setItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => 
                    item.id === product.id 
                        ? { ...item, quantity: Math.max(1, item.quantity + quantity) }
                        : item
                );
            }
            return [...prev, { ...product, quantity: Math.max(1, quantity) }];
        });
    }, []); // Dépendances vides : la fonction ne change jamais

    const removeFromCart = useCallback((id: string, removeAll: boolean = true) => {
        setItems(prev => {
            if (removeAll) {
                return prev.filter(item => item.id !== id);
            } else {
                const existing = prev.find(item => item.id === id);
                if (existing && existing.quantity > 1) {
                    return prev.map(item => 
                        item.id === id ? { ...item, quantity: item.quantity - 1 } : item
                    );
                }
                return prev.filter(item => item.id !== id);
            }
        });
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []); // CRITIQUE : Cette fonction est maintenant stable pour useEffect

    const cartTotal = useMemo(() => {
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [items]);

    // On mémorise la valeur du context pour éviter de re-render les consommateurs inutilement
    const value = useMemo(() => ({
        items,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal
    }), [items, addToCart, removeFromCart, clearCart, cartTotal]);

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};