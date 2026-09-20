'use server';

// Gouvernance — prix standards par zone (lecture : tout utilisateur connecté ; écriture : chef de DR / admin).
import { z } from 'zod';
import { secureAction, idArg, PRODUCER_ROLES } from '@/lib/action-guard';
import * as svc from '@/features/governance/services/dr-governance.service';

const upsertPriceArg = z.object({
  subCategoryId: idArg,
  zoneId: idArg,
  pricePerUnit: z.number(), // positivité vérifiée par le service (message dédié)
  unit: z.string().optional(),
});

export async function getStandardPrices(a0: Parameters<typeof svc.getStandardPrices>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.getStandardPrices);
}

export async function upsertStandardPrice(a0: Parameters<typeof svc.upsertStandardPrice>[0]) {
  return secureAction({ roles: PRODUCER_ROLES, schema: z.tuple([upsertPriceArg]) }, [a0], svc.upsertStandardPrice);
}
