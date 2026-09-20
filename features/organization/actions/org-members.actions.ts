'use server';

// Organisation — membres et producteurs rattachés.
// Chaque action : session + rôle (RBAC) → validation Zod → service pur → ApiResult<T>.

import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import { InviteMemberSchema, UpdateMemberSchema } from '@/lib/validators';
import * as svc from '@/features/organization/services/org-manager.service';

export async function getOrgMembers() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgMembers);
}

export async function inviteOrgMember(a0: Parameters<typeof svc.inviteOrgMember>[0]) {
  return secureAction({ schema: z.tuple([InviteMemberSchema]) }, [a0], svc.inviteOrgMember);
}

export async function updateOrgMember(a0: Parameters<typeof svc.updateOrgMember>[0], a1: Parameters<typeof svc.updateOrgMember>[1]) {
  return secureAction({ schema: z.tuple([idArg, UpdateMemberSchema]) }, [a0, a1], svc.updateOrgMember);
}

export async function removeOrgMember(a0: Parameters<typeof svc.removeOrgMember>[0]) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.removeOrgMember);
}

export async function getOrgProducers() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getOrgProducers);
}
