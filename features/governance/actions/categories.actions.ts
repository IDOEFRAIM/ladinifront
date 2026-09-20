'use server';

// Gouvernance — catégories, sous-catégories et blocages par zone.
// Lecture : tout utilisateur connecté (formulaire produit). Écriture : producteur certifié / admin
// (la portée par zone — chef de DR — est revérifiée par le service).
import { z } from 'zod';
import { secureAction, idArg, PRODUCER_ROLES } from '@/lib/action-guard';
import * as svc from '@/features/governance/services/dr-governance.service';

const createCategoryArg = z.object({ name: z.string().min(1).max(100), description: z.string().max(500).optional() });
const createSubCategoryArg = z.object({ categoryId: idArg, name: z.string().min(1).max(100) });
// Les bornes métier (quantité > 0, unité requise…) restent contrôlées par le service avec des messages dédiés.
const minimumArg = z.object({
  subCategoryId: idArg,
  minimumOrderQuantity: z.number().nullable(),
  minimumOrderUnit: z.string().nullish(),
});
const unitConfigArg = z.object({
  subCategoryId: idArg,
  allowedUnits: z.array(z.string()).nullable(),
  priorityUnit: z.string().nullish(),
});
const blockArg = z.object({ subCategoryId: idArg, zoneId: idArg, block: z.boolean() });

export async function getCategories() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getCategories);
}

export async function createCategory(a0: Parameters<typeof svc.createCategory>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([createCategoryArg]) }, [a0], svc.createCategory);
}

export async function createSubCategory(a0: Parameters<typeof svc.createSubCategory>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([createSubCategoryArg]) }, [a0], svc.createSubCategory);
}

export async function updateSubCategoryMinimum(a0: Parameters<typeof svc.updateSubCategoryMinimum>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([minimumArg]) }, [a0], svc.updateSubCategoryMinimum);
}

export async function updateSubCategoryUnitConfig(a0: Parameters<typeof svc.updateSubCategoryUnitConfig>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([unitConfigArg]) }, [a0], svc.updateSubCategoryUnitConfig);
}

export async function toggleSubCategoryBlock(a0: Parameters<typeof svc.toggleSubCategoryBlock>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([blockArg]) }, [a0], svc.toggleSubCategoryBlock);
}
