'use server';

// Territoire — réservé aux administrateurs plateforme.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg, ADMIN_ROLES } from '@/lib/action-guard';
import { CreateClimaticRegionSchema, CreateLocationSchema } from '@/lib/validators';
import * as svc from '@/features/territory/services/territory.service';

export async function getClimaticRegions() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.getClimaticRegions);
}

export async function createClimaticRegion(a0: Parameters<typeof svc.createClimaticRegion>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([CreateClimaticRegionSchema]) }, [a0], svc.createClimaticRegion);
}

export async function updateClimaticRegion(a0: Parameters<typeof svc.updateClimaticRegion>[0], a1: Parameters<typeof svc.updateClimaticRegion>[1]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg, CreateClimaticRegionSchema.partial()]) }, [a0, a1], svc.updateClimaticRegion);
}

export async function deleteClimaticRegion(a0: Parameters<typeof svc.deleteClimaticRegion>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg]) }, [a0], svc.deleteClimaticRegion);
}

export async function getLocations(a0?: Parameters<typeof svc.getLocations>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg.optional()]) }, [a0], svc.getLocations);
}

export async function createLocation(a0: Parameters<typeof svc.createLocation>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([CreateLocationSchema]) }, [a0], svc.createLocation);
}

export async function updateLocation(a0: Parameters<typeof svc.updateLocation>[0], a1: Parameters<typeof svc.updateLocation>[1]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg, CreateLocationSchema.partial()]) }, [a0, a1], svc.updateLocation);
}

export async function toggleLocationActive(a0: Parameters<typeof svc.toggleLocationActive>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg]) }, [a0], svc.toggleLocationActive);
}

export async function deleteLocation(a0: Parameters<typeof svc.deleteLocation>[0]) {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([idArg]) }, [a0], svc.deleteLocation);
}

export async function getTerritoryStats() {
  return secureAction({ roles: ADMIN_ROLES, schema: z.tuple([]) }, [], svc.getTerritoryStats);
}
