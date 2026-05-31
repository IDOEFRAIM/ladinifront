'use server';

import { cookies } from 'next/headers';
import { getAccessContext } from '@/lib/api-guard';
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';
import {
  getOnboardingZones,
  getOnboardingOrganizations,
  getOnboardingBuyerTypes,
  completeOnboarding,
  type CompleteOnboardingInput,
} from '@/services/onboarding.service';
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
  }
  return result;
}
