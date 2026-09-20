'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { AdminDashboardData } from '@/features/admin/types/admin-dashboard.types';

/** Chargement des métriques du tableau de bord admin (données initiales serveur ou GET /api/admin/metrics). */
export function useAdminDashboard(initialData?: AdminDashboardData | null, serverRefresh?: () => Promise<AdminDashboardData | null | undefined>) {
  const [data, setData] = useState<AdminDashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (serverRefresh) {
        const res = await serverRefresh();
        setData(res || null);
      } else {
        const res = await axios.get('/api/admin/metrics', { withCredentials: true });
        const result = res.data;
        if (result && result.success && result.data) {
          setData(result.data);
        } else {
          console.warn('Dashboard API returned unexpected payload:', result);
          setErrorMsg((result && result.error) ? String(result.error) : 'Réponse API inattendue');
        }
      }
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Failed loading admin metrics:', err?.message || err, err?.response?.status, err?.response?.data);
      const msg = err?.response?.data?.error || err?.message || 'Erreur réseau';
      setErrorMsg(String(msg));
    } finally { setLoading(false); setIsRefreshing(false); }
  }, [serverRefresh]);

  useEffect(() => { if (!initialData) loadDashboard(); }, [initialData, loadDashboard]);

  return { data, loading, isRefreshing, errorMsg, loadDashboard };
}
