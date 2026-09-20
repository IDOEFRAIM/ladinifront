'use client';

import { useState, useEffect, useRef } from 'react';

export interface AsyncState<T> {
    data: T | null;
    isLoading: boolean;
    error: string | null;
}

// Helper pour savoir si le composant est monté (évite les erreurs d'hydratation)
export function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);
    return mounted;
}

export function useAsyncState<T>(initial: T | null = null): [
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
