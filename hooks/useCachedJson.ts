'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchJsonDeduped, peekCache } from '@/lib/client-cache';

interface State<T> { data: T | null; error: string | null; refreshing: boolean }

/**
 * Lecture JSON avec affichage immédiat des dernières données connues.
 *  - `loading`   : true UNIQUEMENT s'il n'y a encore aucune donnée à montrer (1re visite) → là seulement, un spinner ;
 *  - `refreshing`: true pendant la mise à jour en arrière-plan (afficher un petit indicateur, pas un écran de chargement) ;
 *  - `refresh()` : relance la lecture en gardant les données affichées.
 */
export function useCachedJson<T>(url: string) {
  const [state, setState] = useState<State<T>>(() => {
    const cached = peekCache<T>(url);
    return { data: cached ?? null, error: null, refreshing: cached !== undefined };
  });
  const mounted = useRef(true);

  const apply = useCallback((promise: Promise<T>) => promise.then(
    (data) => { if (mounted.current) setState({ data, error: null, refreshing: false }); },
    (err: unknown) => {
      if (!mounted.current) return;
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      // On garde les données déjà affichées : une panne réseau ne doit pas effacer l'écran.
      setState((prev) => ({ ...prev, error: message, refreshing: false }));
    },
  ), []);

  // Lecture au montage (revalidation même si un cache est affiché) ; les setState ont lieu dans les callbacks de la promesse.
  useEffect(() => {
    mounted.current = true;
    void apply(fetchJsonDeduped<T>(url));
    return () => { mounted.current = false; };
  }, [url, apply]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, refreshing: true }));
    return apply(fetchJsonDeduped<T>(url));
  }, [url, apply]);

  return { data: state.data, error: state.error, loading: state.data === null && state.error === null, refreshing: state.refreshing, refresh };
}
