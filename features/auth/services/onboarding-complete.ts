import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, type ApiResult } from '@/lib/api-result';
import { requestOrganizationMembership } from '@/features/organization/services/membership.service';
import { audit } from '@/lib/audit';
import { CompleteOnboardingSchema, CompleteOnboardingInput } from '@/features/auth/services/onboarding.schemas';

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
