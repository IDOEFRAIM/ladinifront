import { useState, useEffect, useCallback, useRef } from 'react';
import { asError } from '@/lib/errors';

// Définir des interfaces strictes pour la robustesse
export interface DashboardData {
  profile: any;
  activeOrders: unknown[];
  orderHistory: unknown[];
  auctions?: { active: unknown[]; won: unknown[]; lost: unknown[] };
  suggestedProducts: unknown[];
}

export function useBuyerDashboard() {
  const [state, setState] = useState<{ data: DashboardData | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDashboard = useCallback(async () => {
    // Annuler la requête précédente si elle existe encore
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/buyer/dashboard', { 
        signal: abortControllerRef.current.signal 
      });

      if (!res.ok) throw new Error('Impossible de charger les données.');
      
      const data = await res.json();
      setState({ data, loading: false, error: null });
    } catch (_err: unknown) {
    const err = asError(_err);
      if (err.name === 'AbortError') return;
      setState({ data: null, loading: false, error: err.message });
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    return () => abortControllerRef.current?.abort();
  }, [fetchDashboard]);

  return { ...state, refresh: fetchDashboard };
}