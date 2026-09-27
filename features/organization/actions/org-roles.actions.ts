'use server';

// Organisation — rôles dynamiques.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { CreateRoleDefSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgRoles() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgRoles);
}

export async function createOrgRole(a0: Parameters<typeof svc.createOrgRole>[0]) {
  return secureAction({ schema: z.tuple([CreateRoleDefSchema]) }, [a0], svc.createOrgRole);
}

export async function updateOrgRole(a0: Parameters<typeof svc.updateOrgRole>[0], a1: Parameters<typeof svc.updateOrgRole>[1]) {
  return secureAction({ schema: z.tuple([idArg, CreateRoleDefSchema.partial()]) }, [a0, a1], svc.updateOrgRole);
}

export async function deleteOrgRole(a0: Parameters<typeof svc.deleteOrgRole>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.deleteOrgRole);
}
