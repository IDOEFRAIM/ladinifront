'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgentAction, MonitoringFilters, PaginationParams, PaginatedResponse } from '@/types/monitoring';
import { AgentActionService, monitoringSSE } from '@/features/monitoring/services/monitoring-client.service';
import { useMounted, useAsyncState } from '@/features/monitoring/hooks/use-async-state';

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
