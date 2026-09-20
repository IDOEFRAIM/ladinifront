'use server';

// Organisation — allocations de semences.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { CreateAllocationSchema, UpdateAllocationSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgAllocations() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgAllocations);
}

export async function createOrgAllocation(a0: Parameters<typeof svc.createOrgAllocation>[0]) {
  return secureAction({ schema: z.tuple([CreateAllocationSchema]) }, [a0], svc.createOrgAllocation);
}

export async function updateOrgAllocation(a0: Parameters<typeof svc.updateOrgAllocation>[0], a1: Parameters<typeof svc.updateOrgAllocation>[1]) {
  return secureAction({ schema: z.tuple([idArg, UpdateAllocationSchema]) }, [a0, a1], svc.updateOrgAllocation);
}

export async function deleteOrgAllocation(a0: Parameters<typeof svc.deleteOrgAllocation>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.deleteOrgAllocation);
}
