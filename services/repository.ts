 'use client';

import axios from 'axios';
import { localDb, cacheProductsLocally, getLocalProducts } from '@/lib/dexie';

const API_URL = '/api/products';

export const ProductRepository = {
  /**
   * Network First, Fallback to Cache
   */
  async getAllProducts() {
    try {
      const response = await axios.get(API_URL, { headers: { 'cache-control': 'no-store' } });
      const products = response.data;

      await cacheProductsLocally(products);
      return products;
    } catch {
      const cached = await getLocalProducts();
      return cached;
    }
  },

  async getProductById(id: string) {
    if (!localDb) return undefined;
    return await localDb.products.get(id);
  },

  async searchProducts(query: string) {
    if (!query) return this.getAllProducts();
    if (!localDb) return [];

    const lower = query.toLowerCase();
    return await localDb.products
      .filter((p: any) => p.name?.toLowerCase().includes(lower))
      .toArray();
  },
};