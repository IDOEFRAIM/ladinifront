'use client';

import { useEffect, useCallback } from 'react';
import type { AgentMetricsSummary, AgentHealthStatus } from '@/types/monitoring';
import { MetricsService } from '@/features/monitoring/services/monitoring-client.service';
import { useMounted, useAsyncState } from '@/features/monitoring/hooks/use-async-state';

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
