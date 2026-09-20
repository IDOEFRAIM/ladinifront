'use server';

// Administration plateforme — réservé aux ADMIN / SUPERADMIN.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg, ADMIN_ROLES } from '@/lib/action-guard';
import * as svc from '@/features/admin/services/admin.service';

export async function getAdminProducers() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.getAdminProducers);
}

export async function updateProducerStatus(a0: Parameters<typeof svc.updateProducerStatus>[0], a1: Parameters<typeof svc.updateProducerStatus>[1]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg, idArg]) }, [a0, a1], svc.updateProducerStatus);
}

export async function getAdminProducts() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.getAdminProducts);
}

export async function getAdminValidations() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.getAdminValidations);
}
