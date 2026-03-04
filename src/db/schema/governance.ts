import {
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql, type InferModel } from 'drizzle-orm';
import { governanceSchema, organizationTypeEnum, orgRoleEnum, orgStatusEnum, unitEnum } from './_config';

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
  userId: uuid('user_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  role: orgRoleEnum('role').default('FIELD_AGENT').notNull(),
  roleId: uuid('role_id'),
  managedZoneId: uuid('managed_zone_id'),
}, (t) => [
  uniqueIndex('user_org_unique').on(t.userId, t.organizationId),
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
  climaticRegionId: uuid('climatic_region_id').notNull(),
  organizationId: uuid('organization_id'),
  parentId: uuid('parent_id'),
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
]);

export const workZones = governanceSchema.table('work_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  zoneId: uuid('zone_id').notNull(),
  managerId: uuid('manager_id'),
  role: text('role'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('work_zones_org_zone_unique').on(t.organizationId, t.zoneId),
  index('work_zones_org_idx').on(t.organizationId),
  index('work_zones_zone_idx').on(t.zoneId),
]);

export const zoneMetrics = governanceSchema.table('zone_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull(),
  date: timestamp('date').defaultNow().notNull(),
  metricName: text('metric_name').notNull(),
  value: doublePrecision('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('zone_metrics_composite_idx').on(t.zoneId, t.date, t.metricName),
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
  categoryId: uuid('category_id').notNull(),
  name: text('name').notNull(),
  blockedZoneIds: text('blocked_zone_ids').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('sub_categories_cat_name_unique').on(t.categoryId, t.name),
]);

export const standardPrices = governanceSchema.table('standard_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  subCategoryId: uuid('sub_category_id').notNull(),
  zoneId: uuid('zone_id').notNull(),
  pricePerUnit: doublePrecision('price_per_unit').notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  updatedById: uuid('updated_by_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('standard_prices_sub_zone_unique').on(t.subCategoryId, t.zoneId),
  index('standard_prices_zone_idx').on(t.zoneId),
]);

export const zoneSettings = governanceSchema.table('zone_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('zone_settings_zone_key_unique').on(t.zoneId, t.key),
  index('zone_settings_zone_idx').on(t.zoneId),
]);

export const overlayLayers = governanceSchema.table('overlay_layers', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('overlay_layers_zone_key_unique').on(t.zoneId, t.key),
  index('overlay_layers_zone_idx').on(t.zoneId),
]);

export default {
  organizations,
  userOrganizations,
  roleDefs,
  climaticRegions,
  zones,
  workZones,
  zoneMetrics,
  categories,
  subCategories,
  standardPrices,
  zoneSettings,
  overlayLayers,
};

// Types
export type Organization = InferModel<typeof organizations>;
export type UserOrganization = InferModel<typeof userOrganizations>;
export type RoleDef = InferModel<typeof roleDefs>;
export type Zone = InferModel<typeof zones>;
export type SubCategory = InferModel<typeof subCategories>;
export type StandardPrice = InferModel<typeof standardPrices>;
// governance schema proxy

// Relations are defined centrally in ./relations.ts
