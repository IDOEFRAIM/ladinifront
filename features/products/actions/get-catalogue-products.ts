'use server';

import type { Category } from '@/features/products/services/catalogue.service';

// Lectures PUBLIQUES du catalogue (aucun contrôle d'accès : données publiques, cache ISR côté pages).
// Safe wrapper around public product server actions.
// This module does lazy DB imports inside try/catch so build won't fail when DB is unreachable.

export async function fetchProductsServer(_filters: { category?: string; region?: string; search?: string } = {}) {
  try {
    const mod = await import('@/features/products/services/public-products.service');
    if (mod && typeof mod.fetchProductsServer === 'function') {
      return await mod.fetchProductsServer(_filters);
    }
  } catch (err) {
    // If the real module fails (e.g., DB unreachable), return empty list as safe fallback.
    console.warn('[publicProduct.safe] fetchProductsServer fallback due to:', (err as any)?.message || err);
  }
  return [];
}

export async function fetchProductByIdServer(id: string) {
  try {
    const mod = await import('@/features/products/services/public-products.service');
    if (mod && typeof mod.fetchProductByIdServer === 'function') {
      return await mod.fetchProductByIdServer(id);
    }
  } catch (err) {
    console.warn('[publicProduct.safe] fetchProductByIdServer fallback due to:', (err as any)?.message || err);
  }
  return null;
}

export async function fetchFiltersServer() {
  try {
    const mod = await import('@/features/products/services/public-products.service');
    if (mod && typeof mod.fetchFiltersServer === 'function') {
      return await mod.fetchFiltersServer();
    }
  } catch (err) {
    console.warn('[publicProduct.safe] fetchFiltersServer fallback due to:', (err as any)?.message || err);
  }
  return { categories: [] as string[], locations: [] as any[] };
}

