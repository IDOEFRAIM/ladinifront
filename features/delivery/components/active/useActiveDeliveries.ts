'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DeliveryData } from '@/features/delivery/components/active/delivery-ui';

/** Livraisons de l'agent (actives + 10 dernières passées) et actions ramassage / confirmation OTP / échec. */
export function useActiveDeliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Récupération de l'historique mémoïsée ─────────────────────────
  const fetchHistory = useCallback(async (showSilentLoader = false) => {
    if (!showSilentLoader) setLoading(true);
    try {
      const res = await fetch('/api/delivery/status');
      if (res.ok) {
        const all: DeliveryData[] = await res.json();
        
        // Séparer les livraisons actives de l'historique passé
        const active = all.filter((d) => ['ASSIGNED', 'IN_TRANSIT'].includes(d.status));
        const recent = all.filter((d) => !['ASSIGNED', 'IN_TRANSIT'].includes(d.status)).slice(0, 10);
        
        setDeliveries([...active, ...recent]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Actions : Prise en charge et Clôture de course ────────────────
  const doAction = async (action: 'PICKUP' | 'CONFIRM' | 'FAILED', deliveryId: string, extra?: Record<string, string>) => {
    if (actionLoading) return; // Anti-double clic global pendant une requête
    setActionLoading(`${deliveryId}-${action}`);
    
    try {
      const isConfirmAction = action === 'CONFIRM';
      const endpoint = isConfirmAction ? '/api/delivery/confirm' : '/api/delivery/status';
      
      const payload = isConfirmAction 
        ? { deliveryId, otpCode: extra?.otpCode }
        : { action, deliveryId, ...extra };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Nettoyer l'input OTP de cette carte si l'action est validée
        if (isConfirmAction) {
          setOtpInputs(prev => {
            const next = { ...prev };
            delete next[deliveryId];
            return next;
          });
        }
        
        // Rafraîchissement silencieux des données en arrière-plan
        await fetchHistory(true);
      } else {
        alert(data.error || 'Une erreur est survenue.');
      }
    } catch {
      alert('Erreur réseau. Veuillez vérifier votre connexion.');
    } finally {
      setActionLoading(null);
    }
  };

  return { deliveries, loading, otpInputs, setOtpInputs, actionLoading, fetchHistory, doAction };
}
