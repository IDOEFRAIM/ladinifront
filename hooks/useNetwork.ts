// hooks/useNetwork.ts
'use client'; // Important : ne fonctionne que côté navigateur

import { useState, useEffect } from 'react';

export function useNetwork() {
    // Par défaut, on suppose qu'on est en ligne pour éviter un flash "Hors ligne" au chargement
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Si on est sur le serveur (SSR), on ne fait rien
        if (typeof window === 'undefined') return;

        // Initialisation de l'état réel
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        // On écoute les événements du navigateur
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Nettoyage quand le composant est détruit
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}