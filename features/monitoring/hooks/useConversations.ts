'use client';

import { useEffect, useCallback } from 'react';
import type { Conversation, MonitoringFilters, PaginationParams, PaginatedResponse } from '@/types/monitoring';
import { ConversationService, monitoringSSE } from '@/features/monitoring/services/monitoring-client.service';
import { useMounted, useAsyncState } from '@/features/monitoring/hooks/use-async-state';

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
