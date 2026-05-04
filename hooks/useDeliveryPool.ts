'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

/**
 * useDeliveryPool — "Marketplace de Livraison"
 *
 * 1. Récupère toutes les commandes au statut PENDING (pool commun)
 * 2. acceptDelivery(deliveryId) — premier arrivé, premier servi
 * 3. Mise à jour en temps réel via polling (15s pour pool, 10s pour actives)
 * 4. Actions: pickup, confirmOTP, markFailed
 */
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
  const mountedRef = useRef(true);

  // ── Fetch available pool ──────────────────────────────────────────────
  const refreshPool = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/available');
      if (!res.ok) throw new Error('Erreur réseau');
      const data = await res.json();
      if (mountedRef.current) {
        setState(prev => ({ ...prev, available: data, error: null }));
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, error: e.message }));
      }
    }
  }, []);

  // ── Fetch active + past deliveries ────────────────────────────────────
  const refreshActive = useCallback(async () => {
    try {
      const res = await fetch('/api/delivery/status');
      if (!res.ok) return;
      const all: ActiveDelivery[] = await res.json();
      if (mountedRef.current) {
        const active = all.filter(d => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
        const past = all.filter(d => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status)).slice(0, 20);
        setState(prev => ({ ...prev, active, past }));
      }
    } catch { /* silent */ }
  }, []);

  // ── Initial load + polling ────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      setState(prev => ({ ...prev, loading: true }));
      await Promise.all([refreshPool(), refreshActive()]);
      if (mountedRef.current) setState(prev => ({ ...prev, loading: false }));
    };
    init();

    const poolInterval = setInterval(refreshPool, 15_000);
    const activeInterval = setInterval(refreshActive, 10_000);

    return () => {
      mountedRef.current = false;
      clearInterval(poolInterval);
      clearInterval(activeInterval);
    };
  }, [refreshPool, refreshActive]);

  // ── Accept (claim) a delivery — premier arrivé premier servi ──────────
  const acceptDelivery = async (deliveryId: string): Promise<{ success: boolean; error?: string }> => {
    setClaiming(deliveryId);
    try {
      const res = await fetch('/api/delivery/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from pool immediately (optimistic)
        setState(prev => ({
          ...prev,
          available: prev.available.filter(d => d.deliveryId !== deliveryId),
        }));
        // Refresh actives to show the new delivery
        await refreshActive();
        return { success: true };
      }
      return { success: false, error: data.error || 'Déjà prise par un autre livreur' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    } finally {
      setClaiming(null);
    }
  };

  // ── Confirm pickup ────────────────────────────────────────────────────
  const confirmPickup = async (deliveryId: string): Promise<{ success: boolean; error?: string }> => {
    setActionLoading(`${deliveryId}-PICKUP`);
    try {
      const res = await fetch('/api/delivery/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PICKUP', deliveryId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshActive();
        return { success: true };
      }
      return { success: false, error: data.error || 'Erreur' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    } finally {
      setActionLoading(null);
    }
  };

  // ── Confirm delivery with OTP ─────────────────────────────────────────
  const confirmDelivery = async (deliveryId: string, otpCode: string): Promise<{ success: boolean; error?: string }> => {
    setActionLoading(`${deliveryId}-CONFIRM`);
    try {
      const res = await fetch('/api/delivery/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId, otpCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await Promise.all([refreshActive(), refreshPool()]);
        return { success: true };
      }
      return { success: false, error: data.error || 'Code OTP invalide' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    } finally {
      setActionLoading(null);
    }
  };

  // ── Mark as failed ────────────────────────────────────────────────────
  const markFailed = async (deliveryId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
    setActionLoading(`${deliveryId}-FAILED`);
    try {
      const res = await fetch('/api/delivery/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FAILED', deliveryId, reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshActive();
        return { success: true };
      }
      return { success: false, error: data.error || 'Erreur' };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    } finally {
      setActionLoading(null);
    }
  };

  // ── Online / Offline toggle ───────────────────────────────────────────
  const toggleOnline = async (goOnline: boolean): Promise<boolean> => {
    try {
      const res = await fetch('/api/delivery/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: goOnline ? 'GO_ONLINE' : 'GO_OFFLINE' }),
      });
      if (res.ok) {
        if (goOnline) refreshPool();
        return true;
      }
      return false;
    } catch {
      return false;
    }
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
