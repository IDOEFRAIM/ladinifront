'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { ACTIVE_ORDER_STATUSES, STATUS_LABELS, STATUS_COLORS, type OrderStatus } from '@/lib/orderStateMachine';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  BUYER DASHBOARD SERVICE — Commandes, Livraisons, Enchères          ║
// ╚══════════════════════════════════════════════════════════════════════╝

/**
 * Résout l'ID profil acheteur à partir du userId de session.
 */
async function getProfileIdOrThrow(userId: string): Promise<string | null> {
  const profile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
    columns: { id: true },
  });
  return profile?.id ?? null;
}

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

/**
 * Historique des enchères de l'acheteur (gagnées / perdues / en cours).
 */
export async function getBuyerAuctionHistory(userId: string) {
  if (!userId) return { active: [], won: [], lost: [] };

  const allAuctions = await db.query.auctions.findMany({
    // IMPORTANT: auctions.buyerId references users.id (not buyer_profiles.id)
    where: eq(schema.auctions.buyerId, userId),
    orderBy: [desc(schema.auctions.createdAt)],
    with: {
      subCategory: { columns: { id: true, name: true } },
      bids: {
        columns: { id: true, offeredPrice: true, isWinner: true, producerId: true },
      },
      targetZone: { columns: { id: true, name: true } },
    },
  });

  const active = allAuctions.filter(a => a.status === 'OPEN');
  const won = allAuctions.filter(a => a.status === 'CLOSED' && a.bids.some(b => b.isWinner));
  const lost = allAuctions.filter(a => a.status === 'CLOSED' && !a.bids.some(b => b.isWinner));

  return { active, won, lost };
}

/**
 * Chronologie complète d'une commande pour l'affichage client (Tracking).
 * Retourne un tableau d'étapes ordonnées avec timestamps réels.
 */
export async function getOrderTrackingTimeline(orderId: string, userId: string) {
  if (!orderId || !userId) return null;

  const profileId = await getProfileIdOrThrow(userId);
  if (!profileId) return null;

  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.id, orderId),
      eq(schema.orders.buyerId, profileId),
    ),
    columns: {
      id: true,
      status: true,
      deliveryStatus: true,
      customerName: true,
      totalAmount: true,
      city: true,
      deliveryDesc: true,
      paymentMethod: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      items: {
        with: {
          product: { columns: { id: true, name: true, unit: true, images: true } },
        },
      },
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
          createdAt: true,
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

  if (!order) return null;

  // Build chronological timeline from order + delivery timestamps
  const timeline: Array<{
    step: string;
    label: string;
    color: string;
    timestamp: string | null;
    reached: boolean;
  }> = [];

  const orderStatus = (order.status as string).toUpperCase() as OrderStatus;
  const delivery = order.delivery;

  // Step 1: Order placed
  timeline.push({
    step: 'PLACED',
    label: 'Commande passée',
    color: STATUS_COLORS.PENDING,
    timestamp: order.createdAt?.toISOString() ?? null,
    reached: true,
  });

  // Step 2: Confirmed
  const isConfirmed = ['CONFIRMED', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED'].includes(orderStatus);
  timeline.push({
    step: 'CONFIRMED',
    label: STATUS_LABELS.CONFIRMED,
    color: STATUS_COLORS.CONFIRMED,
    timestamp: isConfirmed ? (order.updatedAt?.toISOString() ?? null) : null,
    reached: isConfirmed,
  });

  // Step 3: Processing / Preparation
  const isProcessing = ['PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED'].includes(orderStatus);
  timeline.push({
    step: 'PROCESSING',
    label: STATUS_LABELS.PROCESSING,
    color: STATUS_COLORS.PROCESSING,
    timestamp: isProcessing ? (delivery?.createdAt?.toISOString() ?? order.updatedAt?.toISOString() ?? null) : null,
    reached: isProcessing,
  });

  // Step 4: Agent assigned
  const isAssigned = !!delivery?.assignedAt;
  timeline.push({
    step: 'ASSIGNED',
    label: 'Livreur assigné',
    color: '#2563EB',
    timestamp: delivery?.assignedAt?.toISOString() ?? null,
    reached: isAssigned,
  });

  // Step 5: Picked up / In transit
  const isInTransit = !!delivery?.pickedUpAt;
  timeline.push({
    step: 'IN_TRANSIT',
    label: 'En route',
    color: STATUS_COLORS.SHIPPED,
    timestamp: delivery?.pickedUpAt?.toISOString() ?? null,
    reached: isInTransit,
  });

  // Step 6: Delivered
  const isDelivered = orderStatus === 'DELIVERED' || !!delivery?.deliveredAt;
  timeline.push({
    step: 'DELIVERED',
    label: STATUS_LABELS.DELIVERED,
    color: STATUS_COLORS.DELIVERED,
    timestamp: delivery?.deliveredAt?.toISOString() ?? null,
    reached: isDelivered,
  });

  // Failed case
  const isFailed = orderStatus === 'CANCELLED' || !!delivery?.failedAt;

  return {
    order: {
      id: order.id,
      status: order.status,
      statusLabel: STATUS_LABELS[orderStatus] ?? order.status,
      statusColor: STATUS_COLORS[orderStatus] ?? '#64748B',
      totalAmount: order.totalAmount,
      customerName: order.customerName,
      city: order.city,
      deliveryDesc: order.deliveryDesc,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    },
    items: order.items,
    delivery: delivery ? {
      id: delivery.id,
      status: delivery.status,
      deliveryCode: delivery.deliveryCode,
      estimatedDistanceKm: delivery.estimatedDistanceKm,
      agent: delivery.agent,
      originGps: delivery.originGpsLat ? { lat: delivery.originGpsLat, lng: delivery.originGpsLng } : null,
      destinationGps: delivery.destinationGpsLat ? { lat: delivery.destinationGpsLat, lng: delivery.destinationGpsLng } : null,
    } : null,
    timeline,
    isFailed,
  };
}