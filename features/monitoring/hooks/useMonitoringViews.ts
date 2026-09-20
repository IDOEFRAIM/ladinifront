'use client';

import { useEffect, useCallback } from 'react';
import type { AdminMonitoringView, ProducerMonitoringView, BuyerMonitoringView } from '@/types/monitoring';
import { MonitoringViewService } from '@/features/monitoring/services/monitoring-client.service';
import { useMounted, useAsyncState } from '@/features/monitoring/hooks/use-async-state';

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
