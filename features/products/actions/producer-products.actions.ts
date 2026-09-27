'use server';

// Catalogue du producteur connecté.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import * as svc from '@/features/products/services/producer-products.service';

export async function getMyProducts() {
  return secureAction({ access: 'producer', schema: z.tuple([]) }, [], svc.getMyProducts);
}

export async function deleteProduct(a0: Parameters<typeof svc.deleteProduct>[0]) {
  return secureAction({ access: 'producer', schema: z.tuple([idArg]) }, [a0], svc.deleteProduct);
}
