'use server';

// Organisation — zones de travail.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { AssignWorkZoneSchema, UpdateWorkZoneSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgWorkZones() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgWorkZones);
}

export async function assignWorkZone(a0: Parameters<typeof svc.assignWorkZone>[0]) {
  return secureAction({ schema: z.tuple([AssignWorkZoneSchema]) }, [a0], svc.assignWorkZone);
}

export async function updateWorkZone(a0: Parameters<typeof svc.updateWorkZone>[0], a1: Parameters<typeof svc.updateWorkZone>[1]) {
  return secureAction({ schema: z.tuple([idArg, UpdateWorkZoneSchema]) }, [a0, a1], svc.updateWorkZone);
}

export async function removeWorkZone(a0: Parameters<typeof svc.removeWorkZone>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.removeWorkZone);
}

export async function getAvailableZones() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getAvailableZones);
}
