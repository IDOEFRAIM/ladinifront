// hooks/useBackgroundSync.ts
import { useEffect } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import { processSyncQueue } from '@/lib/syncService';

export function useBackgroundSync() {
    const isOnline = useNetwork();

    useEffect(() => {
        if (isOnline) {
            console.log("   Réseau rétabli, tentative de synchronisation...");
            processSyncQueue();
        }
    }, [isOnline]);
}