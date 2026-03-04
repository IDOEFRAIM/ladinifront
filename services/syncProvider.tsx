'use client';
import { useEffect } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import { processSyncQueue } from '@/lib/syncService';

export default function SyncProvider() {
    const isOnline = useNetwork();

    useEffect(() => {
        if (isOnline) {
            if (process.env.NODE_ENV !== 'production') console.log("🌐 Connexion rétablie : Lancement de la synchro...");
            processSyncQueue().then(res => {
                if (res.syncedCount > 0) {
                    alert(`${res.syncedCount} commandes synchronisées !`);
                }
            });
        }
    }, [isOnline]);

    return null; // Ce composant ne dessine rien, il surveille juste
}