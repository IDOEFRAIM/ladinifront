import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { sendOrderNotification } from '@/features/notifications/services/notification.service';
import { calculateDistanceKm } from '@/features/delivery/services/delivery-agents';
import { getAvailableDeliveries } from '@/features/delivery/services/delivery-pool';

/**
 * Génère un OTP à 6 chiffres pour la preuve de livraison.
 */
export function generateDeliveryOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const DELIVERABLE_STATUSES = ['CONFIRMED', 'PROCESSING', 'PAID', 'SHIPPED'];

/**
 * Logique interne partagée pour créer une livraison.
 * Vérifie le statut, l'idempotence, résout les coordonnées, génère l'OTP.
 */
export async function createDeliveryInternal(orderId: string, allowedStatuses: string[]) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true, status: true, zoneId: true,
        gpsLat: true, gpsLng: true, deliveryDesc: true, buyerId: true,
      },
    });

    if (!order) throw new Error('Commande introuvable');
    if (!allowedStatuses.includes(order.status as string)) {
      throw new Error(`Statut invalide pour création de livraison: ${order.status}`);
    }

    // Idempotence : vérifier qu'il n'y a pas déjà une livraison
    const existing = await tx.query.deliveries.findFirst({
      where: eq(schema.deliveries.orderId, orderId),
      columns: { id: true },
    });
    if (existing) return { success: true, data: existing, message: 'Livraison déjà créée' };

    let originLat: number | null = null;
    let originLng: number | null = null;

    const firstItem = await tx.query.orderItems.findFirst({
      where: eq(schema.orderItems.orderId, orderId),
      columns: { productId: true },
      with: {
        product: {
          columns: { producerId: true },
          with: {
            producer: {
              columns: { id: true },
              with: { user: { columns: { latitude: true, longitude: true } } },
            },
          },
        },
      },
    });

    if (firstItem?.product?.producer?.user) {
      originLat = firstItem.product.producer.user.latitude ?? null;
      originLng = firstItem.product.producer.user.longitude ?? null;
    }

    // Calculer la distance estimée
    let estimatedDistance: number | null = null;
    if (originLat && originLng && order.gpsLat && order.gpsLng) {
      estimatedDistance = await calculateDistanceKm(originLat, originLng, order.gpsLat, order.gpsLng);
    }

    const deliveryCode = generateDeliveryOTP();

    const [delivery] = await tx.insert(schema.deliveries).values({
      orderId: order.id,
      status: 'PENDING',
      deliveryCode,
      originGpsLat: originLat,
      originGpsLng: originLng,
      destinationGpsLat: order.gpsLat,
      destinationGpsLng: order.gpsLng,
      destinationDesc: order.deliveryDesc,
      estimatedDistanceKm: estimatedDistance,
    }).returning();

    await tx.update(schema.orders)
      .set({ deliveryStatus: 'PENDING' })
      .where(eq(schema.orders.id, orderId));

    await sendOrderNotification(orderId, 'DELIVERY_CREATED');

    return { success: true, data: delivery };
  });
}

/**
 * Quand une commande passe au statut PAID, crée automatiquement une entrée delivery.
 * Appelé par le flux de paiement (order status change hook).
 */
export async function createDeliveryForPaidOrder(orderId: string) {
  return createDeliveryInternal(orderId, ['PAID']);
}

/**
 * Variante pour les commandes COD (paiement à la livraison).
 * Accepte tout statut "livrable" (CONFIRMED, PROCESSING, PAID, SHIPPED).
 */
export async function createDeliveryForConfirmedOrder(orderId: string) {
  return createDeliveryInternal(orderId, DELIVERABLE_STATUSES);
}

/**
 * Rattrape les commandes livrables (CONFIRMED/PROCESSING/PAID/SHIPPED) qui
 * n'ont AUCUNE ligne `deliveries` correspondante.
 *
 * Incident réel (2026-08-28) : `createDeliveryForConfirmedOrder` n'est
 * déclenché QUE par le code Next.js lui-même (`app/actions/orders.server.ts`,
 * `services/order.hooks.ts`) au moment du changement de statut d'une
 * commande — jamais par l'agent WhatsApp Python, qui écrit directement en
 * base via son propre service layer et ignore totalement ces hooks.
 * Résultat : `marketplace.deliveries` restait VIDE alors que des dizaines de
 * commandes `source=WHATSAPP` étaient déjà CONFIRMED — le livreur voyait
 * "Rien pour l'instant" malgré des commandes bien réelles en attente.
 * `createDeliveryInternal` est déjà idempotent (vérifie l'existence avant
 * d'insérer) : ce rattrapage peut tourner à CHAQUE appel de
 * `getAvailableDeliveries` sans risque de doublon — après le premier passage
 * qui comble le retard, les appels suivants ne trouvent plus rien à créer.
 */
export async function reconcileMissingDeliveries(): Promise<void> {
  const orphanOrders = await db
    .select({ id: schema.orders.id })
    .from(schema.orders)
    .leftJoin(schema.deliveries, eq(schema.deliveries.orderId, schema.orders.id))
    .where(and(
      isNull(schema.deliveries.id),
      inArray(schema.orders.status, DELIVERABLE_STATUSES),
    ))
    .limit(100);

  if (!orphanOrders.length) return;

  for (const { id } of orphanOrders) {
    try {
      await createDeliveryForConfirmedOrder(id);
    } catch (err) {
      console.error('[delivery.service] reconcileMissingDeliveries failed for order', id, err);
    }
  }
}
