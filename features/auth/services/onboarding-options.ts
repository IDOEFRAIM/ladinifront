import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { ok, type ApiResult } from '@/lib/api-result';

export type ZoneOption = { id: string; name: string; code: string };

export async function getOnboardingZones(): Promise<ApiResult<ZoneOption[]>> {
  const zones = await db.select({
    id: schema.zones.id,
    name: schema.zones.name,
    code: schema.zones.code,
  }).from(schema.zones)
    .where(eq(schema.zones.isActive, true))
    .orderBy(asc(schema.zones.name));

  return ok(zones);
}

export type OrgOption = { id: string; name: string; type: string };

export async function getOnboardingOrganizations(): Promise<ApiResult<OrgOption[]>> {
  const orgs = await db.select({
    id: schema.organizations.id,
    name: schema.organizations.name,
    type: schema.organizations.type,
  }).from(schema.organizations)
    .where(eq(schema.organizations.status, 'ACTIVE'))
    .orderBy(asc(schema.organizations.name));

  return ok(orgs);
}

export type BuyerTypeOption = { id: string; name: string; description: string | null };

export async function getOnboardingBuyerTypes(): Promise<ApiResult<BuyerTypeOption[]>> {
  const types = await db.select({
    id: schema.buyerTypes.id,
    name: schema.buyerTypes.name,
    description: schema.buyerTypes.description,
  }).from(schema.buyerTypes)
    .orderBy(asc(schema.buyerTypes.name));

  return ok(types);
}

// ── Complete Onboarding ───────────────────────────────────────────────
