import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadBufferToSupabase } from '@/lib/supabase.server';
import { resolveBuyerProfileId } from '@/services/buyerProfiles.service';
import { getInitialStatus, shouldCreateDelivery } from '@/lib/orderStateMachine';


const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function createOrderFromForm(formData: FormData, buyerId?: string) {
  // 1. Vérification de l'authentification
  if (!buyerId) {
    throw new Error('UNAUTHENTICATED');
  }

  const raw = formData.get('data') as string | null;
  if (!raw) throw new Error('MISSING_DATA');
  
  const payload = JSON.parse(raw);
  const productIds = payload.items.map((i: any) => i.id);

  // 2. Récupération des produits depuis la DB (Source de vérité pour les prix)
  const products = await db.query.products.findMany({ 
    where: inArray(schema.products.id, productIds) 
  });

  // --- VALIDATION DE SÉCURITÉ ---
  let calculatedTotal = 0;

  for (const it of payload.items) {
    const p = products.find((x: any) => x.id === it.id);
    
    // Vérifier l'existence et le stock
    if (!p || (p.quantityForSale ?? 0) < it.qty) {
      throw new Error('PRODUCT_UNAVAILABLE');
    }

    // Vérifier les valeurs aberrantes
    if (it.qty <= 0 || p.price <= 0) {
      throw new Error('INVALID_VALUES_ABERRANT');
    }

    // Calculer le total réel basé sur les prix de la BASE DE DONNÉES
    calculatedTotal += Number(p.price) * it.qty;
  }

  // Vérifier si le total envoyé par le client correspond au total réel (± 1 unité pour les arrondis)
  if (Math.abs(calculatedTotal - payload.totalAmount) > 1) {
    console.error(`Fraude possible: Total reçu ${payload.totalAmount}, Total réel ${calculatedTotal}`);
    throw new Error('PRICE_MISMATCH_FRAUD_DETECTED');
  }

  // 3. Gestion du fichier Audio (Voice Note)
  let audioUrl: string | null = null;
  const voiceFile = formData.get('voiceNote') as File | null;

  if (voiceFile && voiceFile.size > 0) {
    if (voiceFile.size > MAX_AUDIO_SIZE) throw new Error('AUDIO_TOO_LARGE');

    const fileName = `${Date.now()}_order.webm`;
    try {
      const buffer = Buffer.from(await voiceFile.arrayBuffer());
      const remotePath = `audio/${fileName}`;
      // Tentative d'upload Cloud
      const publicUrl = await uploadBufferToSupabase(remotePath, buffer, voiceFile.type || 'audio/webm');
      audioUrl = publicUrl || null;
    } catch (err) {
      // Fallback Local
      console.warn('Fallback local pour l\'audio');
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), Buffer.from(await voiceFile.arrayBuffer()));
      audioUrl = `/uploads/audio/${fileName}`;
    }
  }

  // 4. Résolution du profil acheteur
  // @ts-ignore (Utilise ta logique resolveBuyerProfileId)
  const buyerProfileId = await resolveBuyerProfileId(buyerId);
  if (!buyerProfileId) throw new Error('BUYER_PROFILE_NOT_FOUND');

  const paymentMethod = (payload.paymentMethod || 'CASH').toUpperCase();
  // @ts-ignore (Utilise ta logique de machine à état)
  const initialStatus = getInitialStatus(paymentMethod);

  // 5. TRANSACTION ATOMIQUE (Insertion Order + Items)
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.insert(schema.orders).values({
      customerName: payload.customer.name,
      customerPhone: payload.customer.phone,
      totalAmount: calculatedTotal, // On utilise le total calculé sécurisé
      city: payload.delivery?.city ?? null,
      gpsLat: payload.delivery?.lat?.toString() ?? null,
      gpsLng: payload.delivery?.lng?.toString() ?? null,
      deliveryDesc: payload.delivery?.description ?? null,
      paymentMethod: paymentMethod as any,
      status: initialStatus as any,
      audioUrl,
      buyerId: buyerProfileId,
    }).returning();

    const itemRows = payload.items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.id);
      return {
        orderId: order.id,
        productId: item.id,
        quantity: item.qty,
        priceAtSale: product?.price ?? 0, // Prix figé au moment de la vente
      };
    });

    await tx.insert(schema.orderItems).values(itemRows);
    return order;
  });

  // 6. Déclenchement automatique de la livraison
  // @ts-ignore
  if (shouldCreateDelivery(initialStatus)) {
    try {
      const { createDeliveryForConfirmedOrder } = await import('@/services/delivery.service');
      await createDeliveryForConfirmedOrder(result.id);
    } catch (err) {
      console.error('Erreur création livraison auto:', err);
    }
  }

  return { success: true, orderId: result.id };
}

/**
 * Récupère les commandes pour un producteur spécifique
 */
export async function fetchProducerOrders(userId?: string) {
  if (!userId) return [];

  const producer = await db.query.producers.findFirst({ 
    where: eq(schema.producers.userId, userId),
    columns: { id: true } 
  });
  
  if (!producer) return [];

  const producerProducts = await db.select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.producerId, producer.id));

  const productIds = producerProducts.map(p => p.id);
  if (productIds.length === 0) return [];

  const orderItems = await db.query.orderItems.findMany({
    where: inArray(schema.orderItems.productId, productIds),
    with: {
      order: true,
      product: { columns: { name: true, unit: true } }
    }
  });

  // Groupement par commande pour une interface propre
  const ordersMap = new Map();
  for (const item of orderItems) {
    if (!ordersMap.has(item.orderId)) {
      ordersMap.set(item.orderId, {
        id: item.orderId,
        customerName: item.order.customerName || 'Client',
        customerPhone: item.order.customerPhone || '',
        location: item.order.city || item.order.deliveryDesc || '',
        date: item.order.createdAt,
        status: (item.order.status as string).toLowerCase(),
        total: 0,
        items: []
      });
    }
    const order = ordersMap.get(item.orderId);
    order.items.push({
      name: item.product.name,
      quantity: item.quantity,
      unit: item.product.unit,
      price: item.priceAtSale
    });
    order.total += Number(item.priceAtSale) * item.quantity;
  }

  return Array.from(ordersMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
}


export async function fetchOrderDetailsForProducer(orderId: string, userId?: string) {
  if (!orderId || !userId) return null;
  // Ensure producer
  const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
  if (!producer) return null;

  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    columns: { id: true, createdAt: true, updatedAt: true, customerName: true, customerPhone: true, city: true, deliveryDesc: true, status: true },
  });
  if (!order) return null;

  const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer.id));
  const productIds = producerProducts.map((p: any) => p.id);

  const filteredItems = await db.query.orderItems.findMany({ where: (t, { and }) => and(eq(schema.orderItems.orderId, orderId), inArray(schema.orderItems.productId, productIds)), with: { product: { columns: { name: true, unit: true } } } });
  if (filteredItems.length === 0) return null;

  let producerSubtotal = 0;
  const formattedItems = filteredItems.map(item => { const price = item.priceAtSale; producerSubtotal += item.quantity * price; return { id: item.id, name: item.product.name, quantity: item.quantity, unit: item.product.unit, price }; });

  return {
    id: order.id,
    customerName: order.customerName || 'Client',
    customerPhone: order.customerPhone || '',
    location: order.city || order.deliveryDesc || '',
    date: order.createdAt,
    total: producerSubtotal,
    status: (String(order.status || 'PENDING')).toLowerCase(),
    items: formattedItems,
    deliveryFee: 1500,
  };
}

import { userHasPermission } from '@/services/role.service';
import { assertTransition } from '@/lib/orderStateMachine';
import { runOrderStatusHooks } from '@/services/order.hooks';

export async function updateOrderStatusAction(orderId: string, newStatus: string, userId?: string) {
  if (!orderId) return null;

  // 1. Load current order to validate transition
  const current = await db.query.orders.findFirst({
    where: eq(schema.orders.id, orderId),
    columns: { id: true, status: true },
  });
  if (!current) throw new Error('ORDER_NOT_FOUND');

  // 2. State machine guard — throws on invalid transition
  const validatedStatus = assertTransition(current.status as string, newStatus);

  // 3. Ownership / permission check
  if (userId) {
    const producer = await db.query.producers.findFirst({
      where: eq(schema.producers.userId, userId),
      columns: { id: true },
    });
    const producerProducts = await db.select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.producerId, producer?.id ?? ''));
    const productIds = producerProducts.map((p: any) => p.id);

    let ownershipCheck = null;
    if (productIds.length > 0) {
      ownershipCheck = await db.query.orderItems.findFirst({
        where: (t, { and }) => and(
          eq(schema.orderItems.orderId, orderId),
          inArray(schema.orderItems.productId, productIds),
        ),
      });
    }

    if (!ownershipCheck) {
      const canModifyAny = await userHasPermission(userId, 'ORDER_MODIFY_ANY');
      if (!canModifyAny) {
        const e: any = new Error('FORBIDDEN');
        e.code = 'FORBIDDEN';
        throw e;
      }
    }
  }

  // 4. Persist
  const [updated] = await db.update(schema.orders)
    .set({ status: validatedStatus as any })
    .where(eq(schema.orders.id, orderId))
    .returning({ id: schema.orders.id, status: schema.orders.status, updatedAt: schema.orders.updatedAt });

  // 5. Post-transition hooks (delivery creation + buyer notification)
  if (updated) {
    await runOrderStatusHooks(updated.id, validatedStatus);
  }

  return updated;
}
