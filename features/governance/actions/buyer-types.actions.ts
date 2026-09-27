'use server';

// Gouvernance — types d'acheteurs (réservé aux administrateurs plateforme).
import { z } from 'zod';
import { secureAction, idArg, ADMIN_ROLES } from '@/lib/action-guard';
import * as svc from '@/features/governance/services/buyer-types.service';

const nameField = z.string().min(1).max(100);
const descriptionField = z.string().max(500).nullish();

export async function listBuyerTypes() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.listBuyerTypes);
}

export async function createBuyerType(a0: Parameters<typeof svc.createBuyerType>[0]) {
  return secureAction(
    { roles: ADMIN_ROLES, schema: z.tuple([z.object({ name: nameField, description: descriptionField })]) },
    [a0],
    svc.createBuyerType
  );
}

export async function updateBuyerType(a0: Parameters<typeof svc.updateBuyerType>[0]) {
  return secureAction(
    { roles: ADMIN_ROLES, schema: z.tuple([z.object({ id: idArg, name: nameField, description: descriptionField })]) },
    [a0],
    svc.updateBuyerType
  );
}
