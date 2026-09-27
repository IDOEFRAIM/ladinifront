'use client';

import { useState, useEffect, useRef } from 'react';
import type { MonitoringEvent } from '@/types/monitoring';
import { monitoringSSE } from '@/features/monitoring/services/monitoring-client.service';
import { useMounted } from '@/features/monitoring/hooks/use-async-state';

export function useMonitoringSSE(
    role?: string,
    onEvent?: (event: MonitoringEvent) => void
) {
    const [isConnected, setIsConnected] = useState(false);
    const isMounted = useMounted();
    const isDev = process.env.NODE_ENV !== 'production';

    // Utiliser une ref pour onEvent pour éviter que le useEffect ne dépende
    // d'une fonction qui change à chaque rendu (problème fréquent qui relance la connexion)
    const onEventRef = useRef(onEvent);
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        // Protection cruciale : on attend que le composant soit monté ET que le rôle soit défini
        if (!isMounted || !role) return;

        if (isDev) console.log(`Initialisation SSE pour role: ${role}`); // Debug

        try {
            monitoringSSE.connect(role);

            const checkConnection = setInterval(() => {
                setIsConnected(monitoringSSE.isConnected);
            }, 2000);

            // Abonnement global avec la ref stable
            const unsub = monitoringSSE.on('*', (e) => {
                if (onEventRef.current) {
                    onEventRef.current(e);
                }
            });

            return () => {
                clearInterval(checkConnection);
                unsub();
                monitoringSSE.disconnect();
                setIsConnected(false);
            };
        } catch (error) {
            console.error("SSE Connection Error:", error);
            setIsConnected(false);
        }
    }, [role, isMounted]); // Dépendances minimales et stables

    return { isConnected: isConnected && isMounted };
}
