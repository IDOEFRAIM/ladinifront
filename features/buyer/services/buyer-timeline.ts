import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';
import { STATUS_LABELS, STATUS_COLORS, type OrderStatus } from '@/lib/orderStateMachine';
import { getProfileIdOrThrow } from '@/features/buyer/services/buyer-shared';

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
