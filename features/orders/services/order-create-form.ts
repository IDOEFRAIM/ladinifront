import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { inArray } from 'drizzle-orm';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { uploadBufferToSupabase } from '@/lib/supabase.server';
import { resolveBuyerProfileId } from '@/features/buyer/services/buyerProfiles.service';
import { getInitialStatus, shouldCreateDelivery } from '@/lib/orderStateMachine';

export const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

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
    if (!p || Number(p.quantityForSale ?? 0) < it.qty) {
      throw new Error('PRODUCT_UNAVAILABLE');
    }

    // Vérifier les valeurs aberrantes
    if (it.qty <= 0 || Number(p.price) <= 0) {
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

  const buyerProfileId = await resolveBuyerProfileId(buyerId);
  if (!buyerProfileId) throw new Error('BUYER_PROFILE_NOT_FOUND');

  const paymentMethod = (payload.paymentMethod || 'CASH').toUpperCase();
  const initialStatus = getInitialStatus(paymentMethod);

  // 5. TRANSACTION ATOMIQUE (Insertion Order + Items)
  const result = await db.transaction(async (tx) => {
    const [order] = await tx.insert(schema.orders).values({
      customerName: payload.customer.name,
      customerPhone: payload.customer.phone,
      totalAmount: String(calculatedTotal), // On utilise le total calculé sécurisé
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
        priceAtSale: product?.price ?? '0', // Prix figé au moment de la vente
      };
    });

    await tx.insert(schema.orderItems).values(itemRows);
    return order;
  });

  if (shouldCreateDelivery(initialStatus)) {
    try {
      const { createDeliveryForConfirmedOrder } = await import('@/features/delivery/services/delivery.service');
      await createDeliveryForConfirmedOrder(result.id);
    } catch (err) {
      console.error('Erreur création livraison auto:', err);
    }
  }

  return { success: true, orderId: result.id };
}
