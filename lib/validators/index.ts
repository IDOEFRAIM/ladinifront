/**
 * VALIDATION CENTRALISÉE — AgriConnect v2
 * Toutes les validations Zod au même endroit.
 */
import { z } from 'zod';

// ╔══════════════════════════════════════════════╗
// ║  CONSTANTES DE VALIDATION                    ║
// ╚══════════════════════════════════════════════╝

const PHONE_REGEX = /^(\+226)?[0-9]{8,}$/;
const CUID_REGEX = /^c[a-z0-9]{24,}$/;

// Keep validator list aligned with Prisma `Role` enum: USER, BUYER, PRODUCER, ADMIN, AGENT
export const VALID_SYSTEM_ROLES = ['SUPERADMIN', 'ADMIN', 'USER', 'PRODUCER', 'BUYER', 'AGENT'] as const;
// Aligned with Prisma enum OrgRole { ADMIN, ZONE_MANAGER, SALES_MANAGER, FIELD_AGENT }
export const VALID_ORG_ROLES = ['ADMIN', 'ZONE_MANAGER', 'SALES_MANAGER', 'FIELD_AGENT'] as const;
export const VALID_MOVEMENT_TYPES = ['IN', 'OUT', 'WASTE', 'TRANSFER'] as const;

// Legacy aliases
export const VALID_ROLES = VALID_SYSTEM_ROLES;

// ╔══════════════════════════════════════════════╗
// ║  PRIMITIVES RÉUTILISABLES                    ║
// ╚══════════════════════════════════════════════╝

export const IdSchema = z.string().min(1, "ID requis");
export const CuidSchema = z.string().regex(CUID_REGEX, "ID invalide");
export const EmailSchema = z.string().email("Email invalide").max(255);
export const PhoneSchema = z.string().regex(PHONE_REGEX, "Numéro de téléphone invalide (format Burkina Faso)").optional();
export const PositiveFloat = z.number().min(0, "La valeur doit être positive");
export const StrictPositiveFloat = z.number().gt(0, "La valeur doit être strictement positive");

// ╔══════════════════════════════════════════════╗
// ║  AUTH — Inscription & Connexion              ║
// ╚══════════════════════════════════════════════╝

export const RegisterSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: EmailSchema,
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(128),
  role: z.enum(VALID_SYSTEM_ROLES).default('USER'),
  phone: PhoneSchema,
  adminSecret: z.string().optional(),
  locationId: z.string().optional(),
}).refine((data) => {
  if (data.role === 'ADMIN' && !data.adminSecret) return false;
  return true;
}, {
  message: "Code secret requis pour les administrateurs",
  path: ["adminSecret"],
});

// Extend registration schema to allow a producer to request organization creation
export const RegisterWithOrgSchema = RegisterSchema.extend({
  organizationId: z.string().optional(),
  wantsOrganization: z.boolean().optional().default(false),
  orgName: z.string().min(2, 'Nom de l\'organisation requis').max(200).optional(),
  orgType: z.enum(['GOVERNMENT_REGIONAL', 'COOPERATIVE', 'NGO', 'PRIVATE_TRADER', 'RESELLER'] as const).optional(),
  orgTaxId: z.string().max(50).optional().nullable(),
  orgDescription: z.string().max(2000).optional().nullable(),
}).refine((data) => {
  if (data.wantsOrganization && !data.organizationId) {
    return !!(data.orgName && data.orgType);
  }
  return true;
}, {
  message: 'Les champs organisation sont requis si vous demandez la création d\'une organisation',
  path: ['orgName'],
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

// ╔══════════════════════════════════════════════╗
// ║  PRODUITS — Création & Mise à jour           ║
// ╚══════════════════════════════════════════════╝

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Nom du produit requis").max(200),
  categoryLabel: z.string().min(1, "Catégorie requise").max(100),
  categoryId: z.string().optional(),
  description: z.string().max(2000).optional().nullable(),
  price: StrictPositiveFloat,
  unit: z.string().min(1, "Unité requise").max(20),
  quantityForSale: PositiveFloat,
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: IdSchema,
});

// ╔══════════════════════════════════════════════╗
// ║  COMMANDES — Création                        ║
// ╚══════════════════════════════════════════════╝

export const OrderItemSchema = z.object({
  id: IdSchema,
  qty: z.number().int().min(1, "Quantité minimum : 1"),
  price: PositiveFloat,
});

export const OrderSchema = z.object({
  customer: z.object({
    name: z.string().min(1, "Nom du client requis").max(100),
    phone: z.string().min(1, "Téléphone requis").max(20),
  }),
  totalAmount: PositiveFloat,
  paymentMethodId: z.string().optional(),
  delivery: z.object({
    city: z.string().max(100).default('Ouagadougou'),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),
    description: z.string().max(500).optional(),
  }),
  locationId: z.string().optional(),
  items: z.array(OrderItemSchema).min(1, "Au moins un produit requis"),
});

export const UpdateOrderStatusSchema = z.object({
  statusId: z.string().min(1, "Status ID requis"),
});

// ╔══════════════════════════════════════════════╗
// ║  INVENTAIRE — Fermes, Stocks, Mouvements     ║
// ╚══════════════════════════════════════════════╝

export const CreateFarmSchema = z.object({
  name: z.string().min(1, "Nom de la ferme requis").max(200),
  location: z.string().max(500).optional(),
  locationId: z.string().optional(),
  size: PositiveFloat.optional(),
  soilType: z.string().max(100).optional(),
  waterSource: z.string().max(100).optional(),
});

export const CreateStockSchema = z.object({
  itemName: z.string().min(1, "Nom de l'article requis").max(200),
  quantity: PositiveFloat,
  unit: z.string().min(1, "Unité requise").max(20),
  batchId: z.string().optional(),
  // Optional stock type: HARVEST (récolte), INPUT (intrant), EQUIPMENT (matériel)
  type: z.enum(['HARVEST', 'INPUT', 'EQUIPMENT']).optional(),
});

export const StockMovementSchema = z.object({
  type: z.enum(VALID_MOVEMENT_TYPES),
  quantity: StrictPositiveFloat,
  reason: z.string().max(500).optional(),
});

// ╔══════════════════════════════════════════════╗
// ║  LOTS (BATCHES)                              ║
// ╚══════════════════════════════════════════════╝

export const CreateBatchSchema = z.object({
  batchCode: z.string().min(1, "Code du lot requis"),
  quantity: PositiveFloat,
  unit: z.string().min(1).max(20).default('kg'),
  productId: z.string().optional(),
  farmId: z.string().optional(),
  harvestDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  qualityGrade: z.string().max(50).optional(),
});

// ╔══════════════════════════════════════════════╗
// ║  DÉPENSES                                    ║
// ╚══════════════════════════════════════════════╝

export const CreateExpenseSchema = z.object({
  label: z.string().min(1, "Libellé requis").max(200),
  amount: StrictPositiveFloat,
  categoryId: z.string().optional(),
  date: z.coerce.date().optional(),
});

// ╔══════════════════════════════════════════════╗
// ║  GESTION TERRITORIALE                        ║
// ╚══════════════════════════════════════════════╝

export const CreateClimaticRegionSchema = z.object({
  name: z.string().min(2, "Nom requis").max(100),
  description: z.string().max(500).optional(),
});

export const CreateLocationSchema = z.object({
  name: z.string().min(2, "Nom du lieu requis").max(100),
  code: z.string().min(2, "Code requis").max(20).transform(v => v.toUpperCase()),
  adminLevelId: IdSchema.optional(),
  parentId: z.string().optional(),
  climaticRegionId: z.string().optional(),
});

export const UpdateLocationSchema = CreateLocationSchema.partial().extend({
  id: IdSchema,
});

// Legacy aliases
export const CreateZoneSchema = CreateLocationSchema;
export const UpdateZoneSchema = UpdateLocationSchema;

// ╔══════════════════════════════════════════════╗
// ║  FILTRES DE RECHERCHE                        ║
// ╚══════════════════════════════════════════════╝

export const ProductFilterSchema = z.object({
  category: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ╔══════════════════════════════════════════════╗
// ║  TYPES DÉRIVÉS (pour le typage TypeScript)   ║
// ╚══════════════════════════════════════════════╝

// ╔══════════════════════════════════════════════╗
// ║  ORG-MANAGER — Organisation, Rôles, Membres  ║
// ╚══════════════════════════════════════════════╝

/** Aligned with Prisma enum OrganizationType */
const VALID_ORG_TYPES = ['GOVERNMENT_REGIONAL', 'COOPERATIVE', 'NGO', 'PRIVATE_TRADER', 'RESELLER'] as const;

export const UpdateOrgSettingsSchema = z.object({
  name: z.string().min(2, 'Nom requis (min 2 caractères)').max(200),
  type: z.enum(VALID_ORG_TYPES),
  taxId: z.string().max(50).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const CreateOrgSchema = UpdateOrgSettingsSchema.extend({});
export const CreateRoleDefSchema = z.object({
  name: z.string().min(2, 'Nom du rôle requis').max(100),
  description: z.string().max(500).optional().nullable(),
  permissions: z.array(z.string().min(1)).min(1, 'Au moins une permission requise'),
});

export const UpdateRoleDefSchema = CreateRoleDefSchema.partial().extend({
  id: IdSchema,
});

export const InviteMemberSchema = z.object({
  /** Email or phone of the existing user to invite */
  identifier: z.string().min(1, 'Email ou téléphone requis'),
  orgRole: z.enum(VALID_ORG_ROLES).default('FIELD_AGENT'),
  roleDefId: z.string().optional().nullable(),
  managedZoneId: z.string().optional().nullable(),
});

export const UpdateMemberSchema = z.object({
  orgRole: z.enum(VALID_ORG_ROLES).optional(),
  roleDefId: z.string().optional().nullable(),
  managedZoneId: z.string().optional().nullable(),
});

export const AssignWorkZoneSchema = z.object({
  zoneId: IdSchema,
  managerId: z.string().optional().nullable(),
  role: z.string().max(100).optional().nullable(),
});

export const UpdateWorkZoneSchema = z.object({
  managerId: z.string().optional().nullable(),
  role: z.string().max(100).optional().nullable(),
});

// ╔══════════════════════════════════════════════╗
// ║  TYPES DÉRIVÉS (pour le typage TypeScript)   ║
// ╚══════════════════════════════════════════════╝

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;
export type CreateFarmInput = z.infer<typeof CreateFarmSchema>;
export type CreateStockInput = z.infer<typeof CreateStockSchema>;
export type StockMovementInput = z.infer<typeof StockMovementSchema>;
export type ProductFilterInput = z.infer<typeof ProductFilterSchema>;
export type CreateClimaticRegionInput = z.infer<typeof CreateClimaticRegionSchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
export type UpdateOrgSettingsInput = z.infer<typeof UpdateOrgSettingsSchema>;
export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
export type CreateRoleDefInput = z.infer<typeof CreateRoleDefSchema>;
export type UpdateRoleDefInput = z.infer<typeof UpdateRoleDefSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof UpdateMemberSchema>;
export type AssignWorkZoneInput = z.infer<typeof AssignWorkZoneSchema>;
export type UpdateWorkZoneInput = z.infer<typeof UpdateWorkZoneSchema>;
// Legacy alias
export type CreateZoneInput = CreateLocationInput;
