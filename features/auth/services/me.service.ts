import { buildAccessContext } from '@/lib/access-context';
import { ok, fail, type ApiResult } from '@/lib/api-result';

export type MePayload = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  producerId: string | null;
  organizations: Array<{ organizationId: string; role: string; name: string }>;
  permissions: string[];
  permissionVersion: number;
  onboardingCompleted: boolean;
};

/**
 * Profil de l'utilisateur connecté. Budget DB : UN aller-retour (contexte d'accès + profil + noms d'organisations
 * chargés ensemble par buildAccessContext, pool `auth`, timeout strict). Aucune requête de repli : une panne DB
 * se propage (503 côté route), une vraie erreur logique reste une 500.
 */
export async function fetchMeServer(userId: string): Promise<ApiResult<MePayload>> {
  if (!userId) return fail('USER_NOT_FOUND');

  const ctx = await buildAccessContext(userId);
  const profile = ctx.profile;
  if (!profile) return fail('USER_NOT_FOUND');

  return ok({
    id: userId,
    name: profile.name,
    email: profile.email,
    role: ctx.role,
    producerId: ctx.producerId || null,
    organizations: ctx.orgScopes.map((o) => ({
      organizationId: o.organizationId,
      role: o.orgRole,
      name: profile.organizationNames[o.organizationId] || 'Organisation inconnue',
    })),
    permissions: Array.from(ctx.permissions),
    permissionVersion: ctx.permissionVersion,
    onboardingCompleted: profile.onboardingCompleted,
  });
}

export default { fetchMeServer };
