import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { sendOrderNotification } from '@/features/notifications/services/notification.service';
import { resolveOrCreateDeliveryAgent } from '@/features/delivery/services/delivery-agents';
import { reconcileMissingDeliveries } from '@/features/delivery/services/delivery-creation';

/**
 * Liste les livraisons disponibles pour un transporteur (sa zone, non assignées).
 */
export async function getAvailableDeliveries(userId: string) {
  if (!userId) return [];

  // Auto-create agent profile if needed
  const agent = await resolveOrCreateDeliveryAgent(userId);
  if (!agent) return [];

  await reconcileMissingDeliveries();

  // Livraisons PENDING sans agent assigné dans la zone
  const conditions = [
    eq(schema.deliveries.status, 'PENDING'),
    isNull(schema.deliveries.deliveryAgentId),
  ];

  const deliveries = await db.query.deliveries.findMany({
    where: and(...conditions),
    with: {
      order: {
        columns: {
          id: true, customerName: true, city: true, deliveryDesc: true,
          gpsLat: true, gpsLng: true, totalAmount: true, zoneId: true, createdAt: true,
        },
      },
    },
  });

  // Filtrer par zone compatible (même zone ou pas de zone)
  return deliveries.filter(d => {
    if (!agent.zoneId) return true;
    return !d.order.zoneId || d.order.zoneId === agent.zoneId;
  }).map(d => ({
    deliveryId: d.id,
    orderId: d.order.id,
    customerName: d.order.customerName,
    city: d.order.city,
    deliveryDesc: d.order.deliveryDesc,
    destinationGpsLat: d.destinationGpsLat,
    destinationGpsLng: d.destinationGpsLng,
    originGpsLat: d.originGpsLat,
    originGpsLng: d.originGpsLng,
    estimatedDistanceKm: d.estimatedDistanceKm,
    totalAmount: d.order.totalAmount,
    createdAt: d.order.createdAt,
  }));
}

// ── Système de Claim ─────────────────────────────────────────────────────

/**
 * Un transporteur "accepte" (claim) une livraison.
 * Lie son delivery_agent_id à la livraison de manière atomique.
 */
export async function claimDelivery(deliveryId: string, userId: string) {
  if (!deliveryId || !userId) return { success: false, error: 'Paramètres manquants' };

  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true, status: true },
  });

  if (!agent) return { success: false, error: 'Profil transporteur introuvable' };
  if (agent.status === 'OFFLINE') return { success: false, error: 'Vous devez être en ligne pour accepter une livraison' };

  return db.transaction(async (tx) => {
    // Optimistic lock : UPDATE WHERE agent IS NULL
    const [updated] = await tx.update(schema.deliveries)
      .set({
        deliveryAgentId: agent.id,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      })
      .where(
        and(
          eq(schema.deliveries.id, deliveryId),
          eq(schema.deliveries.status, 'PENDING'),
          isNull(schema.deliveries.deliveryAgentId)
        )
      )
      .returning();

    if (!updated) {
      return { success: false, error: 'Livraison déjà prise par un autre transporteur' };
    }

    // Mettre à jour le statut de l'agent
    await tx.update(schema.deliveryAgents)
      .set({ status: 'BUSY' })
      .where(eq(schema.deliveryAgents.id, agent.id));

    // Mettre à jour la commande
    await tx.update(schema.orders)
      .set({ deliveryStatus: 'ASSIGNED' })
      .where(eq(schema.orders.id, updated.orderId));

    // Notification : livreur en route
    await sendOrderNotification(updated.orderId, 'DELIVERY_ASSIGNED');

    await audit({
      action: 'CLAIM_DELIVERY',
      entityType: 'Delivery',
      entityId: deliveryId,
      actorId: userId,
      newValue: { agentId: agent.id, assignedAt: new Date().toISOString() },
    });

    return { success: true, data: updated };
  });
}

/**
 * Le transporteur marque la livraison comme "en cours de ramassage" (PICKED_UP).
 */
export async function markPickedUp(deliveryId: string, userId: string) {
  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return { success: false, error: 'Profil transporteur introuvable' };

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(schema.deliveries)
      .set({ status: 'IN_TRANSIT', pickedUpAt: new Date() })
      .where(
        and(
          eq(schema.deliveries.id, deliveryId),
          eq(schema.deliveries.deliveryAgentId, agent.id),
          eq(schema.deliveries.status, 'ASSIGNED')
        )
      )
      .returning();

    if (!updated) return { success: false, error: 'Impossible de mettre à jour ce statut' };

    await tx.update(schema.orders)
      .set({ deliveryStatus: 'IN_TRANSIT' })
      .where(eq(schema.orders.id, updated.orderId));

    await sendOrderNotification(updated.orderId, 'DELIVERY_PICKED_UP');

    return { success: true, data: updated };
  });
}

// ── Preuve de Livraison (OTP) ────────────────────────────────────────────
