'use server';

import { shouldCreateDelivery, getNotificationEvent } from '@/lib/orderStateMachine';

/**
 * Hooks exécutés après chaque changement de statut de commande.
 * Centralisé ici pour éviter la duplication entre :
 *   - updateOrderStatusAction (server action producteur)
 *   - PATCH /api/admin/orders/[id] (admin route)
 *
 * 1. Auto-création de la livraison si le statut est livrable
 * 2. Notification à l'acheteur du changement de statut
 */
export async function runOrderStatusHooks(orderId: string, newStatus: string) {
  const upperStatus = newStatus.toUpperCase();

  // 1. Auto-create delivery for deliverable statuses
  if (shouldCreateDelivery(upperStatus)) {
    try {
      const { createDeliveryForConfirmedOrder } = await import(
        '@/services/delivery.service'
      );
      await createDeliveryForConfirmedOrder(orderId);
    } catch (err: any) {
      // Silently ignore "already exists" — it's expected for idempotent calls
      if (!err?.message?.includes('déjà créée')) {
        console.error('[order.hooks] delivery creation failed:', orderId, err?.message);
      }
    }
  }

  // 2. Notify buyer
  const event = getNotificationEvent(upperStatus);
  if (event) {
    try {
      const { sendOrderNotification } = await import(
        '@/services/notification.service'
      );
      await sendOrderNotification(orderId, event as any);
    } catch (err) {
      console.warn('[order.hooks] notification failed:', orderId, err);
    }
  }
}
