'use server';

// Inventaire producteur (fermes et stocks). La propriété des ressources est revérifiée par le service.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { CreateFarmSchema, CreateStockSchema, StockMovementSchema } from '@/lib/validators';
import * as svc from '@/features/inventory/services/inventory.service';

export async function getFarms() {
  return secureAction({ access: 'producer', schema: z.tuple([]) }, [], svc.getFarms);
}

export async function createFarm(a0: Parameters<typeof svc.createFarm>[0]) {
  return secureAction({ access: 'producer', schema: z.tuple([CreateFarmSchema]) }, [a0], svc.createFarm);
}

export async function getStocks(a0: Parameters<typeof svc.getStocks>[0]) {
  return secureAction({ access: 'producer', schema: z.tuple([idArg]) }, [a0], svc.getStocks);
}

export async function createStock(a0: Parameters<typeof svc.createStock>[0], a1: Parameters<typeof svc.createStock>[1]) {
  return secureAction({ access: 'producer', schema: z.tuple([idArg, CreateStockSchema]) }, [a0, a1], svc.createStock);
}

export async function deleteStock(a0: Parameters<typeof svc.deleteStock>[0]) {
  return secureAction({ access: 'producer', schema: z.tuple([idArg]) }, [a0], svc.deleteStock);
}

export async function addStockMovement(a0: Parameters<typeof svc.addStockMovement>[0], a1: Parameters<typeof svc.addStockMovement>[1]) {
  return secureAction({ access: 'producer', schema: z.tuple([idArg, StockMovementSchema]) }, [a0, a1], svc.addStockMovement);
}
