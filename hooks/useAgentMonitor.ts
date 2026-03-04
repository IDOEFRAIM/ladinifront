'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
    AgentAction,
    Conversation,
    AgentMetricsSummary,
    MonitoringFilters,
    PaginationParams,
    PaginatedResponse,
    MonitoringEvent,
    AdminMonitoringView,
    ProducerMonitoringView,
    BuyerMonitoringView,
    AgentHealthStatus,
} from '@/types/monitoring';
import {
    AgentActionService,
    ConversationService,
    MetricsService,
    MonitoringViewService,
    monitoringSSE,
} from '@/services/monitoring.service';

interface AsyncState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

// Helper pour savoir si le composant est monté (évite les erreurs d'hydratation)
function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return mounted;
}

function useAsyncState<T>(initial: T | null = null): [
    AsyncState<T>,
    {
        setLoading: () => void;
        setData: (data: T) => void;
        setError: (err: string) => void;
    }
] {
    const [state, setState] = useState<AsyncState<T>>({
        data: initial,
        isLoading: false,
        error: null,
    });

    // Utilisation de refs pour éviter de recréer les fonctions à chaque rendu
    // Cela stabilise les dépendances des useEffects consommateurs
    const mountedRef = useRef(true);
    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    return [
        state,
        {
            setLoading: () => {
                if (mountedRef.current) setState((s) => ({ ...s, isLoading: true, error: null }));
            },
            setData: (data: T) => {
                if (mountedRef.current) setState({ data, isLoading: false, error: null });
            },
            setError: (error: string) => {
                if (mountedRef.current) setState((s) => ({ ...s, isLoading: false, error }));
            },
        },
    ];
}

export function useAgentActions(
    filters?: MonitoringFilters,
    pagination?: PaginationParams
) {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<PaginatedResponse<AgentAction>>();
    const [counts, setCounts] = useState<Record<string, number>>({});

    // Stabilisation des dépendances complexes
    const filtersKey = JSON.stringify(filters);
    const paginationKey = JSON.stringify(pagination);

    const fetchData = useCallback(async () => {
        if (!isMounted) return; // Protection
        ctrl.setLoading();
        try {
            // Re-parser les objets pour l'appel API
            const currentFilters = filtersKey ? JSON.parse(filtersKey) : undefined;
            const currentPagination = paginationKey ? JSON.parse(paginationKey) : undefined;
            const data = await AgentActionService.list(currentFilters, currentPagination);
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [filtersKey, paginationKey, isMounted]); // Dépendances stables

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        const unsub = monitoringSSE.on('agent:action:created', () => fetchData());
        const unsub2 = monitoringSSE.on('agent:action:updated', () => fetchData());

        return () => {
            unsub();
            unsub2();
        };
    }, [fetchData, isMounted]);

    return {
        ...state,
        counts,
        refetchData: fetchData,
    };
}

export function useConversations(
    filters?: MonitoringFilters,
    pagination?: PaginationParams
) {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<PaginatedResponse<Conversation>>();

    const filtersKey = JSON.stringify(filters);
    const paginationKey = JSON.stringify(pagination);

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const currentFilters = filtersKey ? JSON.parse(filtersKey) : undefined;
            const currentPagination = paginationKey ? JSON.parse(paginationKey) : undefined;
            
            const data = await ConversationService.list(currentFilters, currentPagination);
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [filtersKey, paginationKey, isMounted]);

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        const unsub = monitoringSSE.on('conversation:new', () => fetchData());
        const unsub2 = monitoringSSE.on('conversation:response', () => fetchData());
        return () => {
            unsub();
            unsub2();
        };
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

export function useMetrics(dateFrom?: string, dateTo?: string) {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<AgentMetricsSummary>();

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const data = await MetricsService.getSummary(dateFrom, dateTo);
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [dateFrom, dateTo, isMounted]);

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    useEffect(() => {
        if (!isMounted) return;
        const interval = setInterval(fetchData, 30_000);
        return () => clearInterval(interval);
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

export function useAgentHealth() {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<AgentHealthStatus[]>();

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const data = await MetricsService.getAgentHealth();
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [isMounted]);

    useEffect(() => {
        if (isMounted) {
            fetchData();
            const interval = setInterval(fetchData, 15_000);
            return () => clearInterval(interval);
        }
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

export function useAdminMonitoringView() {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<AdminMonitoringView>();

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const data = await MonitoringViewService.getAdminView();
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [isMounted]);

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

export function useProducerMonitoringView() {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<ProducerMonitoringView>();

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const data = await MonitoringViewService.getProducerView();
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [isMounted]);

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

export function useBuyerMonitoringView() {
    const isMounted = useMounted();
    const [state, ctrl] = useAsyncState<BuyerMonitoringView>();

    const fetchData = useCallback(async () => {
        if (!isMounted) return;
        ctrl.setLoading();
        try {
            const data = await MonitoringViewService.getBuyerView();
            ctrl.setData(data);
        } catch (err: unknown) {
            ctrl.setError(err instanceof Error ? err.message : 'Erreur inconnue');
        }
    }, [isMounted]);

    useEffect(() => {
        if (isMounted) fetchData();
    }, [fetchData, isMounted]);

    return { ...state, refetchData: fetchData };
}

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