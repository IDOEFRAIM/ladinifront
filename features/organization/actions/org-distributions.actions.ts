'use server';

// Organisation — distributions de semences.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg, objectArg } from '@/lib/action-guard';
import { CreateDistributionSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgDistributions(a0?: Parameters<typeof svc.getOrgDistributions>[0]) {
  return secureAction({ schema: z.tuple([objectArg.optional()]) }, [a0], svc.getOrgDistributions);
}

export async function createOrgDistribution(a0: Parameters<typeof svc.createOrgDistribution>[0]) {
  return secureAction({ schema: z.tuple([CreateDistributionSchema]) }, [a0], svc.createOrgDistribution);
}

export async function cancelOrgDistribution(a0: Parameters<typeof svc.cancelOrgDistribution>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.cancelOrgDistribution);
}
