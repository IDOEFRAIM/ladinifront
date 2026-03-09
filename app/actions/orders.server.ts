import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadBufferToSupabase } from '@/lib/supabase.server';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

export async function createOrderFromForm(formData: FormData, buyerId?: string) {
  // Expecting 'data' field with JSON metadata and optional 'voiceNote' file
  const raw = formData.get('data') as string | null;
  if (!raw) throw new Error('MISSING_DATA');
  const payload = JSON.parse(raw);

  const productIds = payload.items.map((i: any) => i.id);
  // Validate availability
  const products = await db.query.products.findMany({ where: inArray(schema.products.id, productIds) });
  // Simple availability check
  for (const it of payload.items) {
    const p = products.find((x: any) => x.id === it.id);
    if (!p || (p.quantityForSale ?? 0) < it.qty) {
      const e = new Error('PRODUCT_UNAVAILABLE');
      (e as any).code = 'PRODUCT_UNAVAILABLE';
      throw e;
    }
  }

  // Save optional voice note file if present (upload to Supabase storage)
  let audioUrl: string | null = null;
  try {
    const voiceFile = formData.get('voiceNote') as File | null;
    if (voiceFile && (voiceFile as any).size > 0) {
      if ((voiceFile as any).size > MAX_AUDIO_SIZE) {
        const e: any = new Error('AUDIO_TOO_LARGE');
        e.code = 'AUDIO_TOO_LARGE';
        throw e;
      }
      const fileName = `${Date.now()}_order.webm`;
      try {
        const buffer = Buffer.from(await (voiceFile as any).arrayBuffer());
        const remotePath = `audio/${fileName}`;
        const publicUrl = await uploadBufferToSupabase(remotePath, buffer, (voiceFile as any).type || 'audio/webm');
        if (publicUrl) audioUrl = publicUrl;
      } catch (err) {
        // Fallback to local disk if Supabase upload fails
        console.warn('Supabase upload failed, falling back to local disk:', err);
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
        await mkdir(uploadDir, { recursive: true });
        const fileName = `${Date.now()}_order.webm`;
        await writeFile(path.join(uploadDir, fileName), Buffer.from(await (voiceFile as any).arrayBuffer()));
        audioUrl = `/uploads/audio/${fileName}`;
      }
    }
  } catch (e) {
    console.warn('Warning: failed to save voice note:', e);
  }

  // Create order row (simple example; real app may have order_items table)
  const [order] = await db.insert(schema.orders).values({
    customerName: payload.customer.name,
    customerPhone: payload.customer.phone,
    totalAmount: payload.totalAmount || 0,
    audioUrl,
    buyerId: buyerId || null,
  }).returning();

  return { success: true, orderId: order.id };
}

export async function fetchProducerOrders(userId?: string) {
  if (!userId) return [];

  // Find producer by user id
  const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
  if (!producer) return [];

  // Get product ids for this producer
  const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer.id));
  const productIds = producerProducts.map((p: any) => p.id);
  if (productIds.length === 0) return [];

  const orderItems = await db.query.orderItems.findMany({
    where: inArray(schema.orderItems.productId, productIds),
    with: {
      order: {
        columns: { id: true, status: true, createdAt: true, customerName: true, customerPhone: true, city: true, deliveryDesc: true, buyerId: true },
        with: { buyer: { columns: { name: true, phone: true } } }
      },
      product: { columns: { name: true, unit: true } }
    }
  });

  // Group by order
  const ordersMap = new Map();
  for (const item of orderItems) {
    const orderId = item.orderId;
    if (!ordersMap.has(orderId)) {
      ordersMap.set(orderId, {
        id: orderId,
        customerName: item.order.buyer?.name || item.order.customerName || 'Client',
        customerPhone: item.order.buyer?.phone || item.order.customerPhone || '',
        location: item.order.city || item.order.deliveryDesc || '',
        buyerId: item.order.buyerId || null,
        date: item.order.createdAt,
        total: 0,
        status: (item.order.status as string || 'PENDING').toLowerCase(),
        items: []
      });
    }
    const order = ordersMap.get(orderId);
    order.items.push({ name: item.product.name, quantity: item.quantity, unit: item.product.unit, price: item.priceAtSale });
    order.total += item.quantity * item.priceAtSale;
  }

  return Array.from(ordersMap.values());
}

export async function fetchOrderDetailsForProducer(orderId: string, userId?: string) {
  if (!orderId || !userId) return null;
  // Ensure producer
  const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
  if (!producer) return null;

  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId), columns: { id: true, createdAt: true, updatedAt: true, customerName: true, customerPhone: true, city: true, deliveryDesc: true, status: true }, with: { buyer: { columns: { name: true, phone: true } } } });
  if (!order) return null;

  const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer.id));
  const productIds = producerProducts.map((p: any) => p.id);

  const filteredItems = await db.query.orderItems.findMany({ where: (t, { and }) => and(eq(schema.orderItems.orderId, orderId), inArray(schema.orderItems.productId, productIds)), with: { product: { columns: { name: true, unit: true } } } });
  if (filteredItems.length === 0) return null;

  let producerSubtotal = 0;
  const formattedItems = filteredItems.map(item => { const price = item.priceAtSale; producerSubtotal += item.quantity * price; return { id: item.id, name: item.product.name, quantity: item.quantity, unit: item.product.unit, price }; });

  return {
    id: order.id,
    customerName: order.buyer?.name || order.customerName || 'Client',
    customerPhone: order.buyer?.phone || order.customerPhone || '',
    location: order.city || order.deliveryDesc || '',
    date: order.createdAt,
    total: producerSubtotal,
    status: (String(order.status || 'PENDING')).toLowerCase(),
    items: formattedItems,
    deliveryFee: 1500,
  };
}

import { userHasPermission } from '@/services/role.service';

export async function updateOrderStatusAction(orderId: string, statusId: string, userId?: string) {
  if (!orderId) return null;

  // If userId provided, perform ownership/permission checks server-side
  if (userId) {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
    const producerProducts = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.producerId, producer?.id ?? ''));
    const productIds = producerProducts.map((p: any) => p.id);

    let ownershipCheck = null;
    if (productIds.length > 0) {
      ownershipCheck = await db.query.orderItems.findFirst({ where: (t, { and }) => and(eq(schema.orderItems.orderId, orderId), inArray(schema.orderItems.productId, productIds)) });
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

  const [updated] = await db.update(schema.orders).set({ status: statusId as any }).where(eq(schema.orders.id, orderId)).returning({ id: schema.orders.id, status: schema.orders.status, updatedAt: schema.orders.updatedAt });
  return updated;
}

export default { createOrderFromForm };
