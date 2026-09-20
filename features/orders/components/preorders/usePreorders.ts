'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getPublicFutureProductionsAction } from '@/features/production/actions/production.actions';
import { createPreorderAction, getBuyerPreordersAction, updatePreorderAction, cancelPreorderAction } from '@/features/orders/actions/preorder.actions';
import type { PublicProduction } from '@/features/production/services/production.service';
import type { BuyerPreorder } from '@/features/orders/services/preorder.service';

export type Tab = 'browse' | 'mine';

/** Productions futures, précommandes de l'acheteur et actions (réserver, ajuster, annuler). */
export function usePreorders() {
  const [tab, setTab] = useState<Tab>('browse');
  const [productions, setProductions] = useState<PublicProduction[]>([]);
  const [preorders, setPreorders] = useState<BuyerPreorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updateQty, setUpdateQty] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, mineRes] = await Promise.all([
        getPublicFutureProductionsAction(),
        getBuyerPreordersAction(),
      ]);
      if (prodRes.success) setProductions(prodRes.data);
      if (mineRes.success) setPreorders(mineRes.data);
      else if (!mineRes.success) toast.error(mineRes.error);
    } catch {
      toast.error('Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPreorder = async (marketOfferId: string) => {
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) return toast.error('Quantité invalide');
    setSubmitting(true);
    try {
      const res = await createPreorderAction({ marketOfferId, quantity });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Précommande enregistrée');
      setActiveId(null);
      setQty('');
      await load();
      setTab('mine');
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdate = (order: BuyerPreorder) => {
    setUpdatingOrderId(order.id);
    setUpdateQty(String(order.quantity));
  };

  const handleUpdatePreorder = async () => {
    if (!updatingOrderId) return;
    const quantity = Number(updateQty);
    if (!quantity || quantity <= 0) return toast.error('Quantité invalide');
    setSubmitting(true);
    try {
      const res = await updatePreorderAction({ orderId: updatingOrderId, quantity });
      if (!res.success) return toast.error(mapError(res.error));
      toast.success('Réservation mise à jour');
      setUpdatingOrderId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPreorder = async () => {
    if (!cancelOrderId) return;
    setSubmitting(true);
    try {
      const res = await cancelPreorderAction({ orderId: cancelOrderId });
      if (!res.success) return toast.error(mapError(res.error));
      toast.success('Précommande annulée');
      setCancelOrderId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const mapError = (code?: string | null) => {
    switch (code) {
      case 'ORDER_LOCKED':
        return 'La précommande est déjà confirmée.';
      case 'MODIFICATION_WINDOW_CLOSED':
        return 'Impossible de modifier sous 30 jours avant la disponibilité.';
      case 'INSUFFICIENT_FUTURE_QUANTITY':
        return 'Quantité indisponible.';
      default:
        return code || 'Erreur inattendue';
    }
  };

  return {
    tab, setTab, productions, preorders, loading, activeId, setActiveId, qty, setQty, submitting,
    submitPreorder, openUpdate, handleUpdatePreorder, handleCancelPreorder, setCancelOrderId, updatingOrderId, cancelOrderId,
  };
}
