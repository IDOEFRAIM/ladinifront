import { z } from 'zod';

export const ONBOARDING_ROLES = ['PRODUCER', 'BUYER', 'AGENT'] as const;

export const ORG_TYPES = ['GOVERNMENT_REGIONAL', 'COOPERATIVE', 'NGO', 'PRIVATE_TRADER', 'RESELLER'] as const;

export const CompleteOnboardingSchema = z.object({
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
