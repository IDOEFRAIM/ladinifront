'use server';

// Organisation — paramètres. L'appartenance à l'organisation active est revérifiée en base par le service.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { UpdateOrgSettingsSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgSettings() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgSettings);
}

export async function updateOrgSettings(a0: Parameters<typeof svc.updateOrgSettings>[0]) {
  return secureAction({ schema: z.tuple([UpdateOrgSettingsSchema]) }, [a0], svc.updateOrgSettings);
}
