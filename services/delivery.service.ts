'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import { sendOrderNotification } from '@/services/notification.service';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  DELIVERY SERVICE — Logique Transporteur & Logistique               ║
// ╚══════════════════════════════════════════════════════════════════════╝

// ── Utils ────────────────────────────────────────────────────────────────

/**
 * Génère un OTP à 6 chiffres pour la preuve de livraison.
 */
function generateDeliveryOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Calcule la distance en km entre deux points GPS (formule de Haversine).
 */
export async function calculateDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<number> {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ── Auto-create agent profile ────────────────────────────────────────────

/**
 * Résout ou crée un profil delivery_agent pour un userId.
 * Appelé automatiquement lors des actions agent pour garantir
 * qu'un AGENT a toujours un enregistrement delivery_agents.
 */
export async function resolveOrCreateDeliveryAgent(userId: string) {
  if (!userId) return null;

  const existing = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
  });
  if (existing) return existing;

  // Auto-create with status AVAILABLE (ready to receive deliveries)
  const [created] = await db.insert(schema.deliveryAgents).values({
    userId,
    status: 'AVAILABLE',
  }).returning();

  return created ?? null;
}

// ── Flux Logistique ──────────────────────────────────────────────────────

/**
 * Quand une commande passe au statut PAID, crée automatiquement une entrée delivery
 * et la rend visible aux delivery_agents de la zone correspondante.
 *
 * Appelé par le flux de paiement (order status change hook).
 */
export async function createDeliveryForPaidOrder(orderId: string) {
  return db.transaction(async (tx) => {
    // 1. Charger la commande
    const order = await tx.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true, status: true, zoneId: true,
        gpsLat: true, gpsLng: true, deliveryDesc: true, buyerId: true,
      },
    });

    if (!order) throw new Error('Commande introuvable');
    if (order.status !== 'PAID') throw new Error('La commande n\'est pas au statut PAID');

    // 2. Vérifier qu'il n'y a pas déjà une livraison
    const existing = await tx.query.deliveries.findFirst({
      where: eq(schema.deliveries.orderId, orderId),
      columns: { id: true },
    });
    if (existing) return { success: true, data: existing, message: 'Livraison déjà créée' };

    // 3. Résoudre les coordonnées d'origine (producteur)
    let originLat: number | null = null;
    let originLng: number | null = null;

    const orderItems = await tx.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, orderId),
      columns: { productId: true },
      limit: 1,
    });

    if (orderItems.length > 0) {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, orderItems[0].productId),
        columns: { producerId: true },
      });
      if (product) {
        const producer = await tx.query.producers.findFirst({
          where: eq(schema.producers.id, product.producerId),
          with: { user: { columns: { latitude: true, longitude: true } } },
        });
        originLat = producer?.user?.latitude ?? null;
        originLng = producer?.user?.longitude ?? null;
      }
    }

    // 4. Calculer la distance estimée
    let estimatedDistance: number | null = null;
    if (originLat && originLng && order.gpsLat && order.gpsLng) {
      estimatedDistance = await calculateDistanceKm(originLat, originLng, order.gpsLat, order.gpsLng);
    }

    // 5. Générer l'OTP de livraison
    const deliveryCode = generateDeliveryOTP();

    // 6. Créer la livraison
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

    // 7. Mettre à jour le statut de livraison de la commande
    await tx.update(schema.orders)
      .set({ deliveryStatus: 'PENDING' })
      .where(eq(schema.orders.id, orderId));

    // 8. Notification : commande confirmée, en attente de livreur
    await sendOrderNotification(orderId, 'DELIVERY_CREATED');

    return { success: true, data: delivery };
  });
}

/**
 * Variante pour les commandes COD (paiement à la livraison).
 * La commande est au statut CONFIRMED (pas encore PAID), mais on crée
 * quand même la livraison pour que les transporteurs la voient.
 */
export async function createDeliveryForConfirmedOrder(orderId: string) {
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true, status: true, zoneId: true,
        gpsLat: true, gpsLng: true, deliveryDesc: true, buyerId: true,
      },
    });

    if (!order) throw new Error('Commande introuvable');
    // Accept any deliverable status
    const deliverableStatuses = ['CONFIRMED', 'PROCESSING', 'PAID', 'SHIPPED'];
    if (!deliverableStatuses.includes(order.status as string)) {
      throw new Error(`Statut invalide pour création de livraison: ${order.status}`);
    }

    // Check no existing delivery
    const existing = await tx.query.deliveries.findFirst({
      where: eq(schema.deliveries.orderId, orderId),
      columns: { id: true },
    });
    if (existing) return { success: true, data: existing, message: 'Livraison déjà créée' };

    // Resolve origin (producer GPS)
    let originLat: number | null = null;
    let originLng: number | null = null;

    const orderItems = await tx.query.orderItems.findMany({
      where: eq(schema.orderItems.orderId, orderId),
      columns: { productId: true },
      limit: 1,
    });

    if (orderItems.length > 0) {
      const product = await tx.query.products.findFirst({
        where: eq(schema.products.id, orderItems[0].productId),
        columns: { producerId: true },
      });
      if (product) {
        const producer = await tx.query.producers.findFirst({
          where: eq(schema.producers.id, product.producerId),
          with: { user: { columns: { latitude: true, longitude: true } } },
        });
        originLat = producer?.user?.latitude ?? null;
        originLng = producer?.user?.longitude ?? null;
      }
    }

    // Estimated distance
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
 * Liste les livraisons disponibles pour un transporteur (sa zone, non assignées).
 */
export async function getAvailableDeliveries(userId: string) {
  if (!userId) return [];

  // Auto-create agent profile if needed
  const agent = await resolveOrCreateDeliveryAgent(userId);
  if (!agent) return [];

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

  const [updated] = await db.update(schema.deliveries)
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

  await db.update(schema.orders)
    .set({ deliveryStatus: 'IN_TRANSIT' })
    .where(eq(schema.orders.id, updated.orderId));

  await sendOrderNotification(updated.orderId, 'DELIVERY_PICKED_UP');

  return { success: true, data: updated };
}

// ── Preuve de Livraison (OTP) ────────────────────────────────────────────

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
export async function markDeliveryFailed(deliveryId: string, userId: string, reason?: string) {
  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return { success: false, error: 'Profil transporteur introuvable' };

  const [updated] = await db.update(schema.deliveries)
    .set({ status: 'FAILED', failedAt: new Date() })
    .where(
      and(
        eq(schema.deliveries.id, deliveryId),
        eq(schema.deliveries.deliveryAgentId, agent.id)
      )
    )
    .returning();

  if (!updated) return { success: false, error: 'Livraison introuvable' };

  await db.update(schema.orders)
    .set({ deliveryStatus: 'FAILED' })
    .where(eq(schema.orders.id, updated.orderId));

  // Remettre l'agent disponible
  await db.update(schema.deliveryAgents)
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
}

/**
 * Mise à jour du statut en ligne/hors ligne du transporteur.
 */
export async function updateAgentStatus(userId: string, status: 'AVAILABLE' | 'OFFLINE') {
  // Auto-create profile if needed (first time agent goes online)
  const agent = await resolveOrCreateDeliveryAgent(userId);
  if (!agent) return { success: false, error: 'Impossible de créer le profil transporteur' };

  const [updated] = await db.update(schema.deliveryAgents)
    .set({ status })
    .where(eq(schema.deliveryAgents.userId, userId))
    .returning();

  if (!updated) return { success: false, error: 'Profil transporteur introuvable' };
  return { success: true, data: updated };
}

/**
 * Historique des livraisons d'un transporteur.
 */
export async function getAgentDeliveryHistory(userId: string, limit = 50) {
  const agent = await db.query.deliveryAgents.findFirst({
    where: eq(schema.deliveryAgents.userId, userId),
    columns: { id: true },
  });
  if (!agent) return [];

  return db.query.deliveries.findMany({
    where: eq(schema.deliveries.deliveryAgentId, agent.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit,
    with: {
      order: {
        columns: { id: true, customerName: true, city: true, totalAmount: true, createdAt: true },
      },
    },
  });
}
