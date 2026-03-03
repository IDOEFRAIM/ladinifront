// lib/dexie.ts
'use client';

import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface OfflineOrder {
  id?: number;
  productIds: { productId: string; quantity: number }[];
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  deliveryDesc?: string;
  voiceNoteBlob?: Blob | null;
  gpsLat?: number;
  gpsLng?: number;
  createdAt: Date;
  synced: boolean;
}

export interface CartItem {
  id?: number;
  productId: string;
  quantity: number;
  addedAt: Date;
}

// --- DATABASE CLASS ---
class AgriConnectOfflineDB extends Dexie {
  products!: Table<any, string>; 
  offlineOrders!: Table<OfflineOrder, number>;
  cart!: Table<CartItem, number>;

  constructor() {
    super('AgriConnectOffline');
    this.version(1).stores({
      products: 'id, category, status, producerId', 
      offlineOrders: '++id, synced, createdAt',
      cart: '++id, productId'
    });
  }
}

export const localDb = typeof window !== "undefined" ? new AgriConnectOfflineDB() : null;

// --- HELPERS ---
export async function cacheProductsLocally(products: any[]) {
  if (!localDb) return;
  await localDb.products.bulkPut(products);
}

export async function getLocalProducts(category?: string) {
  if (!localDb) return [];
  if (category) return await localDb.products.where('category').equals(category).toArray();
  return await localDb.products.toArray();
}

export async function queueOfflineOrder(orderData: Omit<OfflineOrder, 'id' | 'synced' | 'createdAt'>) {
  if (!localDb) return;
  return await localDb.offlineOrders.add({
    ...orderData,
    synced: false,
    createdAt: new Date()
  });
}

export async function getPendingSyncOrders() {
  if (!localDb) return [];

  return await localDb.offlineOrders.where('synced').equals(0).toArray();
}

export async function markOrderAsSynced(orderId: number) {
  if (!localDb) return;
  await localDb.offlineOrders.update(orderId, { synced: true });
}

export const cartActions = {
  add: async (productId: string, quantity: number) => {
    if (!localDb) return;
    return await localDb.cart.add({ productId, quantity, addedAt: new Date() });
  },
  get: async () => localDb ? await localDb.cart.toArray() : [],
  clear: async () => localDb?.cart.clear()
};