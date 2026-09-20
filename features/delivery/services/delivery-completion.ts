import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { sendOrderNotification } from '@/features/notifications/services/notification.service';

/**
 * Validation de la livraison via le code OTP donné par l'acheteur.
 * Le livreur saisit le code reçu par l'acheteur pour confirmer la fin de course.
 */
export async function confirmDeliveryWithOTP(input: {
  deliveryId: string;
  userId: string;
  otpCode: string;
}) {
  const { deliveryId, userId, otpCode } = input;

  if (!deliveryId || !otpCode) return { success: false, error: 'Paramètres manquants' };

  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return { success: false, error: 'Profil transporteur introuvable' };

  return db.transaction(async (tx) => {
    // 1. Charger la livraison
    const delivery = await tx.query.deliveries.findFirst({
      where: and(
        eq(schema.deliveries.id, deliveryId),
        eq(schema.deliveries.deliveryAgentId, agent.id)
      ),
    });

    if (!delivery) return { success: false, error: 'Livraison introuvable ou non assignée à vous' };
    if (delivery.status === 'DELIVERED') return { success: false, error: 'Livraison déjà validée' };

    // 2. Vérifier l'OTP
    if (delivery.deliveryCode !== otpCode) {
      return { success: false, error: 'Code de livraison incorrect' };
    }

    // 3. Marquer comme livré
    const now = new Date();
    const [updated] = await tx.update(schema.deliveries)
      .set({ status: 'DELIVERED', deliveredAt: now })
      .where(eq(schema.deliveries.id, deliveryId))
      .returning();

    // 4. Mettre à jour la commande
    await tx.update(schema.orders)
      .set({ status: 'DELIVERED', deliveryStatus: 'DELIVERED' })
      .where(eq(schema.orders.id, delivery.orderId));

    // 5. Remettre l'agent en ligne
    await tx.update(schema.deliveryAgents)
      .set({ status: 'AVAILABLE' })
      .where(eq(schema.deliveryAgents.id, agent.id));

    // 6. Notification : livré
    await sendOrderNotification(delivery.orderId, 'DELIVERY_COMPLETED');

    await audit({
      action: 'CONFIRM_DELIVERY_OTP',
      entityType: 'Delivery',
      entityId: deliveryId,
      actorId: userId,
      newValue: { deliveredAt: now.toISOString() },
    });

    return { success: true, data: updated };
  });
}

/**
 * Le transporteur signale un échec de livraison.
 */
export const FAIL_ALLOWED_STATUSES = ['ASSIGNED', 'IN_TRANSIT'];

export async function markDeliveryFailed(deliveryId: string, userId: string, reason?: string) {
  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return { success: false, error: 'Profil transporteur introuvable' };

  return db.transaction(async (tx) => {
    const delivery = await tx.query.deliveries.findFirst({
      where: and(
        eq(schema.deliveries.id, deliveryId),
        eq(schema.deliveries.deliveryAgentId, agent.id),
      ),
      columns: { id: true, status: true, orderId: true },
    });

    if (!delivery) return { success: false, error: 'Livraison introuvable' };
    if (!FAIL_ALLOWED_STATUSES.includes(delivery.status as string)) {
      return { success: false, error: `Impossible de marquer en échec une livraison au statut ${delivery.status}` };
    }

    const [updated] = await tx.update(schema.deliveries)
      .set({ status: 'FAILED', failedAt: new Date() })
      .where(eq(schema.deliveries.id, deliveryId))
      .returning();

    await tx.update(schema.orders)
      .set({ deliveryStatus: 'FAILED' })
      .where(eq(schema.orders.id, delivery.orderId));

    await tx.update(schema.deliveryAgents)
      .set({ status: 'AVAILABLE' })
      .where(eq(schema.deliveryAgents.id, agent.id));

    await audit({
      action: 'DELIVERY_FAILED',
      entityType: 'Delivery',
      entityId: deliveryId,
      actorId: userId,
      newValue: { reason, failedAt: new Date().toISOString() },
    });

    return { success: true, data: updated };
  });
}
