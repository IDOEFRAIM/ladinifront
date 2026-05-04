'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  NOTIFICATION SERVICE — Triggers WhatsApp & In-App                  ║
// ╚══════════════════════════════════════════════════════════════════════╝

type NotificationEvent =
  | 'ORDER_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'ORDER_PAID'
  | 'DELIVERY_CREATED'
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_PICKED_UP'
  | 'DELIVERY_COMPLETED'
  | 'DELIVERY_FAILED'
  | 'AUCTION_WON'
  | 'AUCTION_LOST'
  | 'AUCTION_EXPIRED';

interface NotificationPayload {
  recipientPhone?: string | null;
  recipientWhatsappId?: string | null;
  recipientName?: string | null;
  event: NotificationEvent;
  orderId?: string;
  deliveryCode?: string;
  extra?: Record<string, unknown>;
}

const MESSAGE_TEMPLATES: Record<NotificationEvent, (ctx: NotificationPayload) => string> = {
  ORDER_CONFIRMED: (ctx) =>
    `Bonjour ${ctx.recipientName || 'Client'} ! Votre commande #${ctx.orderId?.slice(0, 8)} a été confirmée. Nous préparons votre livraison.`,
  ORDER_PROCESSING: (ctx) =>
    `${ctx.recipientName || 'Client'}, votre commande #${ctx.orderId?.slice(0, 8)} est en cours de préparation. Vous serez notifié(e) lors de l'expédition.`,
  ORDER_PAID: (ctx) =>
    `Paiement reçu pour la commande #${ctx.orderId?.slice(0, 8)}. Un livreur sera bientôt assigné.`,
  DELIVERY_CREATED: (ctx) =>
    `Commande #${ctx.orderId?.slice(0, 8)} confirmée ! Votre code de livraison est : ${ctx.deliveryCode}. Communiquez-le au livreur à la réception.`,
  DELIVERY_ASSIGNED: (ctx) =>
    `Un livreur est en route pour votre commande #${ctx.orderId?.slice(0, 8)}. Préparez votre code de livraison.`,
  DELIVERY_PICKED_UP: (ctx) =>
    `Le livreur a récupéré votre commande #${ctx.orderId?.slice(0, 8)} et se dirige vers vous.`,
  DELIVERY_COMPLETED: (ctx) =>
    `Livraison terminée ! Merci pour votre commande #${ctx.orderId?.slice(0, 8)}. À bientôt sur AgriConnect.`,
  DELIVERY_FAILED: (ctx) =>
    `La livraison de votre commande #${ctx.orderId?.slice(0, 8)} a échoué. Notre équipe vous recontactera.`,
  AUCTION_WON: (ctx) =>
    `Félicitations ${ctx.recipientName || ''} ! Votre enchère a été remportée. Une commande a été créée automatiquement.`,
  AUCTION_LOST: (ctx) =>
    `L'enchère #${ctx.extra?.auctionId || ''} est terminée. Votre offre n'a pas été retenue cette fois.`,
  AUCTION_EXPIRED: (ctx) =>
    `L'enchère que vous avez créée a expiré. Un gagnant a été automatiquement sélectionné.`,
};

/**
 * Envoie une notification à l'acheteur pour un événement de commande.
 * Résout automatiquement le destinataire via la commande.
 *
 * Pour WhatsApp : intégration via le champ `whatsapp_id` de la commande.
 * NOTE: L'envoi WhatsApp réel dépend d'un provider externe (Twilio, etc.)
 *       Cette fonction prépare le payload et log l'intention.
 */
export async function sendOrderNotification(orderId: string, event: NotificationEvent) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true, customerName: true, customerPhone: true, whatsappId: true, buyerId: true,
      },
      with: {
        delivery: { columns: { deliveryCode: true } },
      },
    });

    if (!order) return;

    const payload: NotificationPayload = {
      recipientPhone: order.customerPhone,
      recipientWhatsappId: order.whatsappId,
      recipientName: order.customerName,
      event,
      orderId: order.id,
      deliveryCode: order.delivery?.deliveryCode ?? undefined,
    };

    const message = MESSAGE_TEMPLATES[event](payload);

    // ── WhatsApp dispatch ──
    if (order.whatsappId) {
      await dispatchWhatsApp(order.whatsappId, message);
    }

    // ── Log interne pour traçabilité ──
    console.log(`[NOTIFICATION] ${event} → ${order.customerPhone || order.whatsappId || 'unknown'}: ${message}`);

  } catch (err) {
    console.error(`[NOTIFICATION] Failed to send ${event} for order ${orderId}:`, err);
  }
}

/**
 * Dispatch WhatsApp message via provider.
 * TODO: Brancher sur Twilio / WhatsApp Business API / Meta Cloud API.
 *
 * Exemple Twilio :
 * ```
 * const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
 * await twilio.messages.create({
 *   from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
 *   to: `whatsapp:${recipientWhatsappId}`,
 *   body: message,
 * });
 * ```
 */
async function dispatchWhatsApp(recipientWhatsappId: string, message: string): Promise<void> {
  const provider = process.env.WHATSAPP_PROVIDER;

  if (!provider) {
    console.log(`[WHATSAPP_STUB] To: ${recipientWhatsappId} | ${message}`);
    return;
  }

  // Placeholder for real integration
  // switch (provider) {
  //   case 'twilio': ...
  //   case 'meta_cloud': ...
  // }
  console.log(`[WHATSAPP] Provider=${provider} | To: ${recipientWhatsappId} | ${message}`);
}

/**
 * Notification directe par userId (pour les enchères).
 */
export async function sendUserNotification(userId: string, event: NotificationEvent, extra?: Record<string, unknown>) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { id: true, name: true, phone: true },
    });

    if (!user) return;

    const payload: NotificationPayload = {
      recipientPhone: user.phone,
      recipientName: user.name,
      event,
      extra,
    };

    const message = MESSAGE_TEMPLATES[event](payload);
    console.log(`[NOTIFICATION] ${event} → User ${userId}: ${message}`);
  } catch (err) {
    console.error(`[NOTIFICATION] Failed to send ${event} for user ${userId}:`, err);
  }
}
