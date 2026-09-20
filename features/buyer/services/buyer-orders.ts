import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { ACTIVE_ORDER_STATUSES } from '@/lib/orderStateMachine';
import { getProfileIdOrThrow } from '@/features/buyer/services/buyer-shared';

/**
 * Récupère le profil acheteur complet avec le type et le badge de confiance.
 */
export async function getBuyerDashboardProfile(userId: string) {
  if (!userId) return null;

  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
    with: {
      buyerType: { columns: { id: true, name: true } },
      user: { columns: { id: true, name: true, phone: true, cnibNumber: true, identityVerified: true } },
    },
  });

  return profile ?? null;
}

/**
 * Commandes actives de l'acheteur (PENDING, CONFIRMED, PAID, SHIPPED).
 */
export async function getBuyerActiveOrders(userId: string) {
  const profileId = await getProfileIdOrThrow(userId);
  if (!profileId) return [];

  const orders = await db.query.orders.findMany({
    where: and(
      eq(schema.orders.buyerId, profileId),
      inArray(schema.orders.status, ACTIVE_ORDER_STATUSES as any)
    ),
    orderBy: [desc(schema.orders.createdAt)],
    columns: {
      id: true,
      totalAmount: true,
      status: true,
      deliveryStatus: true,
      paymentMethod: true,
      paymentStatus: true,
      city: true,
      deliveryDesc: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      items: {
        with: {
          product: { 
            columns: { id: true, name: true, unit: true, images: true } 
          },
        },
      },
      delivery: {
        with: {
          agent: {
            with: { 
              user: { columns: { name: true, phone: true } } 
            },
          },
        },
      },
    },
  });

  return orders;
}

/**
 * Historique complet des commandes de l'acheteur (toutes statuts).
 */
export async function getBuyerOrderHistory(userId: string, limit = 50) {
  if (!userId) return [];

  const profileId = await getProfileIdOrThrow(userId);
  if (!profileId) return [];

  return db.query.orders.findMany({
    where: eq(schema.orders.buyerId, profileId),
    orderBy: [desc(schema.orders.createdAt)],
    limit,
    columns: {
      id: true,
      totalAmount: true,
      status: true,
      deliveryStatus: true,
      paymentStatus: true,
      city: true,
      createdAt: true,
    },
    with: {
      items: {
        columns: { id: true, quantity: true, priceAtSale: true },
        with: {
          product: { columns: { name: true, unit: true } },
        },
      },
    },
  });
}
