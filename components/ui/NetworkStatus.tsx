// components/System/NetworkStatus.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { useNetwork } from '@/hooks/useNetwork';

export const NetworkStatus = () => {
    const isOnline = useNetwork();
    const [showReconnected, setShowReconnected] = useState(false);

    // Gestion du message "Retour en ligne" temporaire
    useEffect(() => {
        if (isOnline) {
            setShowReconnected(true);
            const timer = setTimeout(() => setShowReconnected(false), 3000); // Disparaît après 3s
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    // Cas 1 : Tout va bien, on n'affiche rien (sauf le flash de retour)
    if (isOnline && !showReconnected) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: isOnline ? '#2E7D32' : '#A63C06', // Vert ou Ocre
            color: '#fff',
            textAlign: 'center',
            padding: '8px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            letterSpacing: '1px',
            transition: 'transform 0.3s ease-in-out',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
            {isOnline ? (
                <span>☁️ CONNEXION RÉTABLIE • SYNCHRONISATION EN COURS...</span>
            ) : (
                <span>📡 MODE HORS-LIGNE • VOUS POUVEZ CONTINUER À COMMANDER</span>
            )}
        </div>
    );
};