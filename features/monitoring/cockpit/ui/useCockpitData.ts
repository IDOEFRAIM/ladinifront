'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface CockpitState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Charge un endpoint du cockpit. Annule la requête précédente (changement de période/filtre), expose loading/error,
 * conserve les données précédentes pendant un rechargement (pas de clignotement) et se rafraîchit toutes les `refreshMs`.
 */
export function useCockpitData<T>(path: string, params: Record<string, string | number | undefined | null>, opts: { refreshMs?: number; enabled?: boolean } = {}): CockpitState<T> {
  const { refreshMs, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${path}${query ? `?${query}` : ''}`;

  useEffect(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(url, { signal: ctrl.signal, credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) {
          let msg = `Erreur ${res.status}`;
          try { msg = ((await res.json()) as { error?: string }).error || msg; } catch { /* corps non JSON */ }
          throw new Error(res.status === 401 || res.status === 403 ? 'Accès réservé aux administrateurs.' : msg);
        }
        setData((await res.json()) as T);
        setError(null);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message || 'Erreur réseau');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [url, tick, enabled]);

  useEffect(() => {
    if (!refreshMs || !enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, enabled]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, refetch };
}
