'use server';

import { cookies } from 'next/headers';
import { getAccessContext } from '@/lib/api-guard';
import { COOKIE_NAMES, publicOpts, httpOnlyOpts } from '@/lib/cookie-helpers';
import { getSessionFromRequest, signSession } from '@/lib/session';
import { invalidateAccessContext } from '@/lib/access-context';
import {
  getOnboardingZones,
  getOnboardingOrganizations,
  getOnboardingBuyerTypes,
  completeOnboarding,
  type CompleteOnboardingInput,
} from '@/features/auth/services/onboarding.service';
import { fail } from '@/lib/api-result';

export async function fetchOnboardingZonesAction() {
  return getOnboardingZones();
}

export async function fetchOnboardingOrganizationsAction() {
  return getOnboardingOrganizations();
}

export async function fetchOnboardingBuyerTypesAction() {
  return getOnboardingBuyerTypes();
}

export async function completeOnboardingAction(input: CompleteOnboardingInput) {
  const { ctx } = await getAccessContext();
  if (!ctx?.userId) return fail('Non authentifié');
  const result = await completeOnboarding(ctx.userId, input);
  if (result.success && result.data) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAMES.ONBOARDING_COMPLETED, '1', publicOpts());
    cookieStore.set(COOKIE_NAMES.USER_ROLE, result.data.role, publicOpts());

    // Le JWT (session-token) contient encore le rôle d'inscription (USER) : le
    // middleware s'en sert pour rediriger /login → /market (espace acheteur).
    // On le ré-émet avec le rôle choisi et onboardingCompleted=true.
    invalidateAccessContext(ctx.userId);
    try {
      const current = await getSessionFromRequest({ cookies: cookieStore });
      const token = await signSession({
        userId: ctx.userId,
        role: String(result.data.role).toUpperCase(),
        permissionVersion: Date.now().toString(),
        activeOrgId: current?.activeOrgId,
        onboardingCompleted: true,
      });
      cookieStore.set(COOKIE_NAMES.SESSION_TOKEN, token, httpOnlyOpts());
    } catch (e) {
      console.error('[onboarding] session refresh failed', e);
    }
  }
  return result;
}
