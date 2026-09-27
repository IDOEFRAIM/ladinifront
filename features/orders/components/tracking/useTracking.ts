'use client';

import { useEffect, useState, useCallback } from 'react';
import { asError } from '@/lib/errors';
import type { TrackingResponse } from '@/features/buyer/types/tracking.types';

/** Suivi d'une commande : chargement, rafraîchissement auto toutes les 30 s (jusqu'à la livraison) et copie du code OTP. */
export function useTracking(orderId: string) {
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = useCallback(async (isRefresh = false) => {
    if (!orderId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/buyer/tracking/${orderId}`);
      if (!res.ok) throw new Error(res.status === 404 ? 'Commande introuvable' : 'Erreur de chargement');
      const json = await res.json();
      setData(json as TrackingResponse);
      setError(null);
    } catch (_e: unknown) {
    const e = asError(_e);
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  // Auto-refresh toutes les 30 secondes pour le temps réel
  useEffect(() => {
    if (!orderId || data?.order?.status === 'DELIVERED') return;
    const interval = setInterval(() => fetchTracking(true), 30000);
    return () => clearInterval(interval);
  }, [orderId, fetchTracking, data?.order?.status]);

  const copyOTP = () => {
    if (data?.delivery?.deliveryCode) {
      navigator.clipboard.writeText(data.delivery.deliveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return { data, loading, refreshing, error, copied, fetchTracking, copyOTP };
}
