'use server';

// Vue globale des stocks — réservé aux ADMIN / SUPERADMIN.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg, ADMIN_ROLES } from '@/lib/action-guard';
import * as svc from '@/features/admin/services/eye-of-god.service';

export async function getEyeOfGodData(a0?: Parameters<typeof svc.getEyeOfGodData>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg.optional()]) }, [a0], svc.getEyeOfGodData);
}
