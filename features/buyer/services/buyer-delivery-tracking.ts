import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { getProfileIdOrThrow } from '@/features/buyer/services/buyer-shared';

/**
 * Suivi de livraison en temps réel pour une commande spécifique.
 */
export async function getBuyerDeliveryTracking(orderId: string, userId: string) {
  if (!orderId || !userId) return null;

  // Vérifier que la commande appartient à l'acheteur
  const profileId = await getProfileIdOrThrow(userId);
  if (!profileId) return null;

  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.id, orderId),
      eq(schema.orders.buyerId, profileId)
    ),
    columns: {
      id: true,
      status: true,
      deliveryStatus: true,
      gpsLat: true,
      gpsLng: true,
    },
    with: {
      delivery: {
        columns: {
          id: true,
          status: true,
          deliveryCode: true,
          originGpsLat: true,
          originGpsLng: true,
          destinationGpsLat: true,
          destinationGpsLng: true,
          estimatedDistanceKm: true,
          assignedAt: true,
          pickedUpAt: true,
          deliveredAt: true,
          failedAt: true,
        },
        with: {
          agent: {
            columns: { id: true, vehicleType: true },
            with: { user: { columns: { name: true, phone: true } } },
          },
        },
      },
    },
  });

  return order ?? null;
}
