'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types (inchangés mais exportés pour la cohérence) ---
export interface PoolDelivery {
  deliveryId: string;
  orderId: string;
  customerName: string | null;
  city: string | null;
  deliveryDesc: string | null;
  destinationGpsLat: number | null;
  destinationGpsLng: number | null;
  originGpsLat: number | null;
  originGpsLng: number | null;
  estimatedDistanceKm: number | null;
  totalAmount: number;
  createdAt: string | null;
}

export interface ActiveDelivery {
  id: string;
  orderId: string;
  status: string;
  deliveryCode?: string | null;
  estimatedDistanceKm?: number | null;
  assignedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  order?: {
    id: string;
    customerName?: string;
    city?: string;
    totalAmount?: number;
    createdAt?: string;
  };
}

type PoolState = {
  available: PoolDelivery[];
  active: ActiveDelivery[];
  past: ActiveDelivery[];
  loading: boolean;
  error: string | null;
};

export function useDeliveryPool() {
  const [state, setState] = useState<PoolState>({
    available: [],
    active: [],
    past: [],
    loading: true,
    error: null,
  });

  const [claiming, setClaiming] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Utilisation de refs pour éviter les fuites de mémoire et les conflits d'appels asynchrones
  const mountedRef = useRef(true);
  const poolAbortController = useRef<AbortController | null>(null);

  // ── Fetch available pool (avec AbortController pour éviter les race conditions) ──
  const refreshPool = useCallback(async () => {
    // Annuler la requête précédente si elle est encore en cours
    if (poolAbortController.current) poolAbortController.current.abort();
    poolAbortController.current = new AbortController();

    try {
      const res = await fetch('/api/delivery/available', { 
        signal: poolAbortController.current.signal 
      });
      if (!res.ok) throw new Error('Erreur lors de la récupération du pool');
      const data = await res.json();
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, available: data, error: null }));
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      if (mountedRef.current) {
        setState(prev => ({ ...prev, error: e.message }));
      }
    }
  }, []);

  // ── Fetch active + past deliveries ────────────────────────────────────
  const refreshActive = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/status');
      if (!res.ok) throw new Error('Erreur status');
      
      const all: ActiveDelivery[] = await res.json();
      
      if (mountedRef.current) {
        // Filtrage précis des statuts
        const active = all.filter(d => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
        const past = all.filter(d => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status)).slice(0, 20);
        
        setState(prev => ({ ...prev, active, past, error: null }));
      }
    } catch { 
      /* Erreur silencieuse pour le polling background */ 
    }
  }, []);

  // ── Initial load + polling ────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      if (mountedRef.current) setState(prev => ({ ...prev, loading: true }));
      await Promise.all([refreshPool(), refreshActive()]);
      if (mountedRef.current) setState(prev => ({ ...prev, loading: false }));
    };

    init();

    const poolInterval = setInterval(refreshPool, 15_000);
    const activeInterval = setInterval(refreshActive, 10_000);

    return () => {
      mountedRef.current = false;
      if (poolAbortController.current) poolAbortController.current.abort();
      clearInterval(poolInterval);
      clearInterval(activeInterval);
    };
  }, [refreshPool, refreshActive]);

  // ── Helpers pour les appels API (réduction de la duplication) ──────────
  const performAction = async (
    url: string, 
    body: object, 
    loadingKey: string,
    setLoading: (val: string | null) => void
  ) => {
    setLoading(loadingKey);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: res.ok, data };
    } catch (e) {
      return { ok: false, data: { error: 'Erreur réseau' } };
    } finally {
      if (mountedRef.current) setLoading(null);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────

  const acceptDelivery = async (deliveryId: string) => {
    const { ok, data } = await performAction('/api/delivery/claim', { deliveryId }, deliveryId, setClaiming);
    
    if (ok && data.success) {
      // Mise à jour optimiste du pool
      setState(prev => ({
        ...prev,
        available: prev.available.filter(d => d.deliveryId !== deliveryId),
      }));
      await refreshActive();
      return { success: true };
    }
    return { success: false, error: data.error || 'Déjà prise ou indisponible' };
  };

  const confirmPickup = async (deliveryId: string) => {
    const { ok, data } = await performAction('/api/delivery/status', { action: 'PICKUP', deliveryId }, `${deliveryId}-PICKUP`, setActionLoading);
    if (ok && data.success) {
      await refreshActive();
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const confirmDelivery = async (deliveryId: string, otpCode: string) => {
    const { ok, data } = await performAction('/api/delivery/confirm', { deliveryId, otpCode }, `${deliveryId}-CONFIRM`, setActionLoading);
    if (ok && data.success) {
      await Promise.all([refreshActive(), refreshPool()]);
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const markFailed = async (deliveryId: string, reason?: string) => {
    const { ok, data } = await performAction('/api/delivery/status', { action: 'FAILED', deliveryId, reason }, `${deliveryId}-FAILED`, setActionLoading);
    if (ok && data.success) {
      await refreshActive();
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const toggleOnline = async (goOnline: boolean): Promise<boolean> => {
    const { ok } = await performAction('/api/delivery/status', { action: goOnline ? 'GO_ONLINE' : 'GO_OFFLINE' }, 'TOGGLE', setActionLoading);
    if (ok) {
      if (goOnline) refreshPool();
      return true;
    }
    return false;
  };

  return {
    ...state,
    claiming,
    actionLoading,
    refreshPool,
    refreshActive,
    acceptDelivery,
    confirmPickup,
    confirmDelivery,
    markFailed,
    toggleOnline,
  };
}