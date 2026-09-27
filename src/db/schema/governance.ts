import {
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  numeric,
  uniqueIndex,
  index,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql, type InferModel } from 'drizzle-orm';
import { governanceSchema, organizationTypeEnum, orgRoleEnum, orgStatusEnum, unitEnum } from './_config';
import { users } from './auth';
//testg 
export const organizations = governanceSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: organizationTypeEnum('type').notNull(),
  taxId: text('tax_id').unique(),
  description: text('description'),
  status: orgStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const userOrganizations = governanceSchema.table('user_organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references((): AnyPgColumn => organizations.id, { onDelete: 'cascade' }).notNull(),
  role: orgRoleEnum('role').default('FIELD_AGENT').notNull(),
  roleId: uuid('role_id').references((): AnyPgColumn => roleDefs.id, { onDelete: 'set null' }),
  managedZoneId: uuid('managed_zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
}, (t) => [
  uniqueIndex('user_org_unique').on(t.userId, t.organizationId),
  index('user_org_user_idx').on(t.userId),
  index('user_org_role_idx').on(t.roleId),
  index('user_org_org_idx').on(t.organizationId),
]);

export const roleDefs = governanceSchema.table('role_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  permissions: text('permissions').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const climaticRegions = governanceSchema.table('climatic_regions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const zones = governanceSchema.table('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  code: text('code').unique().notNull(),
  climaticRegionId: uuid('climatic_region_id').references((): AnyPgColumn => climaticRegions.id, { onDelete: 'restrict' }).notNull(),
  organizationId: uuid('organization_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => zones.id, { onDelete: 'restrict' }),
  path: text('path'),
  depth: integer('depth').default(0).notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('zones_region_idx').on(t.climaticRegionId),
  index('zones_org_idx').on(t.organizationId),
  index('zones_active_idx').on(t.isActive),
  index('zones_parent_idx').on(t.parentId),
  index('zones_path_idx').on(t.path),
  index('ix_zones_name_trgm').using('gin', t.name.op('gin_trgm_ops')),
]);

export const workZones = governanceSchema.table('work_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').references((): AnyPgColumn => organizations.id, { onDelete: 'cascade' }).notNull(),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'cascade' }).notNull(),
  managerId: uuid('manager_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  role: text('role'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('work_zones_org_zone_unique').on(t.organizationId, t.zoneId),
  index('work_zones_org_idx').on(t.organizationId),
  index('work_zones_zone_idx').on(t.zoneId),
]);

export const categories = governanceSchema.table('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const subCategories = governanceSchema.table('sub_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }).notNull(),
  name: text('name').notNull(),
  blockedZoneIds: text('blocked_zone_ids').array().notNull().default(sql`'{}'::text[]`),
  // Politique plateforme (2026-09-02, feature full-stack) : quantité minimale,
  // en unité de BASE, qu'une commande de ce TYPE de produit doit représenter
  // pour être poursuivie — ex. "Tomates" -> 50 KG. Définie par l'ADMIN au
  // niveau du type de produit (voir components/admin/governance/CategoryManager.tsx),
  // jamais par le producteur. NULL = aucune règle configurée = comportement
  // historique (aucun produit existant ne devient soudainement impossible à
  // commander). Table miroir exacte de `domain/governance/models.py::SubCategory`
  // côté agent (Python/SQLAlchemy, même DB Postgres partagée, schéma
  // `governance`) — SOURCE DE VÉRITÉ UNIQUE consommée par les deux ORMs,
  // jamais une copie indépendante. Validée à l'écriture (0/négatif interdits)
  // par `updateSubCategoryMinimum` dans dr-governance.service.ts.
  minimumOrderQuantity: numeric('minimum_order_quantity', { precision: 14, scale: 3 }),
  minimumOrderUnit: unitEnum('minimum_order_unit'),
  // Config unité par sous-catégorie (2026-09-19) — même principe que le seuil
  // ci-dessus : policy PLATEFORME, jamais éditée par le producteur. Consommée
  // directement par l'agent conversationnel (domain/quantity_unit.py côté
  // Python, même table partagée) pour standardiser l'unité d'un produit au
  // lieu de la deviner depuis le texte libre. `allowedUnits` NULL/vide ou
  // `priorityUnit` NULL = "pas configuré" = comportement historique inchangé
  // (aucune contrainte SQL ici par choix : la validation — liste fermée des
  // 7 unités, cohérence priority ∈ allowed — vit côté service d'écriture,
  // voir updateSubCategoryUnitConfig dans dr-governance.service.ts).
  priorityUnit: text('priority_unit'),
  allowedUnits: text('allowed_units').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('sub_categories_cat_name_unique').on(t.categoryId, t.name),
  index('ix_subcategories_name_trgm').using('gin', t.name.op('gin_trgm_ops')),
]);

export const standardPrices = governanceSchema.table('standard_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'restrict' }).notNull(),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'restrict' }).notNull(),
  pricePerUnit: doublePrecision('price_per_unit').notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  updatedById: uuid('updated_by_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('standard_prices_sub_zone_unique').on(t.subCategoryId, t.zoneId),
  index('standard_prices_zone_idx').on(t.zoneId),
]);

// ── PRODUITS INTERDITS (liste noire gérée par les admins) ──────────────────
// Modération : termes bannis de la marketplace (drogue, armes, etc.). Les admins
// alimentent cette table sans redéploiement. Une base par défaut est appliquée
// côté agent même si la table est vide (fail-safe).
export const prohibitedTerms = governanceSchema.table('prohibited_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  term: text('term').unique().notNull(),
  category: text('category').default('ILLICIT').notNull(), // DRUG | WEAPON | COUNTERFEIT | OTHER
  severity: text('severity').default('HIGH').notNull(),     // LOW | MEDIUM | HIGH
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('prohibited_terms_active_idx').on(t.isActive),
]);

export default {
  organizations,
  userOrganizations,
  roleDefs,
  climaticRegions,
  zones,
  workZones,
  categories,
  subCategories,
  standardPrices,
  prohibitedTerms,
};

// Types
export type Organization = InferModel<typeof organizations>;
export type UserOrganization = InferModel<typeof userOrganizations>;
export type RoleDef = InferModel<typeof roleDefs>;
export type Zone = InferModel<typeof zones>;
export type SubCategory = InferModel<typeof subCategories>;
export type StandardPrice = InferModel<typeof standardPrices>;
export type ProhibitedTerm = InferModel<typeof prohibitedTerms>;
// governance schema proxy

// Relations are defined centrally in ./relations.ts