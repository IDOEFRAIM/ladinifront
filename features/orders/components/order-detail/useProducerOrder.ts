'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

/** Chargement et changement de statut d'une commande côté producteur (routes /api/orders/[id]). */
export function useProducerOrder(orderId: string) {
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setStatus('loading');
      const { data } = await axios.get(`/api/orders/${orderId}`);
      
      const normalizedStatus = String(data.status || 'PENDING').toUpperCase();
      const normalizedDeliveryStatus = String(data.deliveryStatus || 'PENDING').toUpperCase();
      
      const displayDate = data.createdAt || data.date
        ? new Date(data.createdAt || data.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })
        : 'Date inconnue';
      
      setOrder({
        ...data,
        status: normalizedStatus,
        deliveryStatus: normalizedDeliveryStatus,
        displayDate
      });
      setStatus('ready');
    } catch (err) {
      console.error("Fetch Error:", err);
      setStatus('error');
    }
  }, [orderId]);

  const updateStatus = async (nextStatus: string) => {
    if (!nextStatus) return;
    setIsUpdating(true);
    try {
      const { data } = await axios.patch(`/api/orders/${orderId}`, { status: nextStatus.toUpperCase() });
      toast.success("Mise à jour logistique enregistrée !");

      const normalizedStatus = String(data.status || nextStatus).toUpperCase();
      const normalizedDeliveryStatus = String(data.deliveryStatus || 'PENDING').toUpperCase();
      const displayDate = data.createdAt || data.date
        ? new Date(data.createdAt || data.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })
        : 'Date inconnue';

      setOrder((prevOrder: any) => ({
        ...(prevOrder || {}),
        ...data,
        status: normalizedStatus,
        deliveryStatus: normalizedDeliveryStatus,
        displayDate,
      }));
    } catch (err) {
      console.error("Update Error:", err);
      toast.error("Erreur lors de la modification du statut.");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  return { order, status, isUpdating, updateStatus };
}
