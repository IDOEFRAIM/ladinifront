'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';
import { ok, fail, type ApiResult } from '@/lib/api-result';
import { requestOrganizationMembership } from './membership.service';
import { audit } from '@/lib/audit';

// ── Zod Schemas ───────────────────────────────────────────────────────

const ONBOARDING_ROLES = ['PRODUCER', 'BUYER', 'AGENT'] as const;
const ORG_TYPES = ['GOVERNMENT_REGIONAL', 'COOPERATIVE', 'NGO', 'PRIVATE_TRADER', 'RESELLER'] as const;

const CompleteOnboardingSchema = z.object({
  role: z.enum(ONBOARDING_ROLES),
  zoneId: z.string().uuid('Zone invalide'),
  // Organization — optional join or creation
  organizationId: z.string().uuid().optional(),
  createOrg: z.boolean().optional(),
  orgName: z.string().min(2).max(200).optional(),
  orgType: z.enum(ORG_TYPES).optional(),
  orgTaxId: z.string().max(50).optional().nullable(),
  orgDescription: z.string().max(2000).optional().nullable(),
  // Buyer-specific
  buyerTypeId: z.string().uuid().optional(),
  establishmentName: z.string().max(200).optional(),
  defaultDeliveryAddress: z.string().max(500).optional(),
  // Producer-specific
  businessName: z.string().max(200).optional(),
  // Agent-specific
  vehicleType: z.string().max(100).optional(),
  licenseNumber: z.string().max(100).optional(),
}).superRefine((d, ctx) => {
  if (d.createOrg) {
    if (!d.orgName) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orgName'], message: 'Nom requis' });
    if (!d.orgType) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['orgType'], message: 'Type requis' });
  }
});

export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingSchema>;

// ── Public data fetchers ──────────────────────────────────────────────

type ZoneOption = { id: string; name: string; code: string };

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

type OrgOption = { id: string; name: string; type: string };

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

type BuyerTypeOption = { id: string; name: string; description: string | null };

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

export async function completeOnboarding(
  userId: string,
  input: CompleteOnboardingInput,
): Promise<ApiResult<{ role: string }>> {
  const parsed = CompleteOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message).join(', '));
  }

  const data = parsed.data;

  // Verify zone exists
  const zone = await db.query.zones.findFirst({
    where: eq(schema.zones.id, data.zoneId),
    columns: { id: true, name: true },
  });
  if (!zone) return fail('Zone introuvable');

  // Verify user exists and is not already onboarded
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, onboardingCompleted: true, name: true },
  });
  if (!user) return fail('Utilisateur introuvable');
  if (user.onboardingCompleted) return fail('Onboarding déjà complété');

  // Transaction: update user + create role profile + handle org
  await db.transaction(async (tx) => {
    // 1. Update user: role, zone, onboardingCompleted
    await tx.update(schema.users).set({
      role: data.role,
      zoneId: data.zoneId,
      onboardingCompleted: true,
    }).where(eq(schema.users.id, userId));

    // 2. Handle organization
    let orgId: string | undefined;
    if (data.createOrg && data.orgName && data.orgType) {
      const [org] = await tx.insert(schema.organizations).values({
        name: data.orgName,
        type: data.orgType,
        taxId: data.orgTaxId ?? null,
        description: data.orgDescription ?? null,
        status: 'PENDING',
      }).returning({ id: schema.organizations.id });

      await tx.insert(schema.userOrganizations).values({
        userId,
        organizationId: org.id,
        role: 'ADMIN',
      });

      orgId = org.id;
    } else if (data.organizationId) {
      orgId = data.organizationId;
      // Check org exists
      const existingOrg = await tx.query.organizations.findFirst({
        where: eq(schema.organizations.id, orgId),
        columns: { id: true },
      });
      if (!existingOrg) throw new Error('Organisation introuvable');

      // Request membership (handles duplicate check internally)
      await requestOrganizationMembership(userId, orgId);
    }

    // 3. Create role-specific profile
    switch (data.role) {
      case 'PRODUCER': {
        const existingProducer = await tx.query.producers.findFirst({
          where: eq(schema.producers.userId, userId),
          columns: { id: true },
        });
        if (!existingProducer) {
          await tx.insert(schema.producers).values({
            userId,
            businessName: data.businessName || user.name || 'Nouveau Producteur',
            status: 'PENDING',
            zoneId: data.zoneId,
            organizationId: orgId,
          });
        } else {
          await tx.update(schema.producers).set({
            zoneId: data.zoneId,
            organizationId: orgId,
            businessName: data.businessName || undefined,
          }).where(eq(schema.producers.userId, userId));
        }
        break;
      }

      case 'BUYER': {
        const existingBuyer = await tx.query.buyerProfiles.findFirst({
          where: eq(schema.buyerProfiles.userId, userId),
          columns: { id: true },
        });
        if (!existingBuyer) {
          await tx.insert(schema.buyerProfiles).values({
            userId,
            buyerTypeId: data.buyerTypeId || null,
            establishmentName: data.establishmentName || null,
            defaultDeliveryAddress: data.defaultDeliveryAddress || null,
            isVerified: false,
          });
        } else {
          await tx.update(schema.buyerProfiles).set({
            buyerTypeId: data.buyerTypeId || undefined,
            establishmentName: data.establishmentName || undefined,
            defaultDeliveryAddress: data.defaultDeliveryAddress || undefined,
          }).where(eq(schema.buyerProfiles.userId, userId));
        }
        break;
      }

      case 'AGENT': {
        const existingAgent = await tx.query.deliveryAgents.findFirst({
          where: eq(schema.deliveryAgents.userId, userId),
          columns: { id: true },
        });
        if (!existingAgent) {
          await tx.insert(schema.deliveryAgents).values({
            userId,
            vehicleType: data.vehicleType || null,
            licenseNumber: data.licenseNumber || null,
            zoneId: data.zoneId,
            status: 'OFFLINE',
          });
        } else {
          await tx.update(schema.deliveryAgents).set({
            vehicleType: data.vehicleType || undefined,
            licenseNumber: data.licenseNumber || undefined,
            zoneId: data.zoneId,
          }).where(eq(schema.deliveryAgents.userId, userId));
        }
        break;
      }
    }
  });

  await audit({
    actorId: userId,
    action: 'ONBOARDING_COMPLETED',
    entityId: userId,
    entityType: 'USER',
    newValue: { role: data.role, zoneId: data.zoneId },
  });

  return ok({ role: data.role });
}
