'use client'

import axios from 'axios';
import { localDb, type OfflineOrder } from './dexie';

/**
 * Synchronise une commande locale vers le serveur via l'API /api/orders
 */
async function syncSingleOrder(order: OfflineOrder): Promise<boolean> {
  if (!localDb) return false;
  
  try {
    const formData = new FormData();

    const orderPayload = {
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
      },
      totalAmount: order.totalAmount,
      paymentMethod: 'cash',
      delivery: {
        city: 'Ouagadougou',
        lat: order.gpsLat || null,
        lng: order.gpsLng || null,
        description: order.deliveryDesc || '',
      },
      items: order.productIds.map(item => ({
        id: item.productId,
        qty: item.quantity,
        price: (item as any).price || 0,
      })),
    };

    formData.append('data', JSON.stringify(orderPayload));

    if (order.voiceNoteBlob) {
      formData.append('voiceNote', order.voiceNoteBlob, `voice_${Date.now()}.webm`);
    }

    const response = await axios.post('/api/orders', formData);

    return response.status >= 200 && response.status < 300;
  } catch (error) {
    console.error("Échec de la synchronisation:", error);
    return false;
  }
}

/**
 * Traite la file d'attente des commandes hors-ligne
 */
export async function processSyncQueue() {
  if (!localDb) return { syncedCount: 0, errors: 0 };

  const pendingOrders = await localDb.offlineOrders
    .where('synced')
    .equals(0)
    .toArray();

  if (pendingOrders.length === 0) return { syncedCount: 0, errors: 0 };

  let syncedCount = 0;
  let errors = 0;

  for (const order of pendingOrders) {
    const success = await syncSingleOrder(order);

    if (success && order.id) {
      await localDb.offlineOrders.update(order.id, { synced: true });
      syncedCount++;
    } else {
      errors++;
    }
  }

  return { syncedCount, errors };
}