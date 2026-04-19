import {
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { type InferModel } from 'drizzle-orm';
import { marketplaceSchema, unitEnum } from './_config';

// Seed allocations: stock assigned by an organization to a zone
export const seedAllocations = marketplaceSchema.table('seed_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  zoneId: uuid('zone_id').notNull(),
  seedType: text('seed_type').notNull(),
  totalQuantity: integer('total_quantity').notNull(),
  remainingQuantity: integer('remaining_quantity').notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  allocatedById: uuid('allocated_by_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('seed_allocations_org_idx').on(t.organizationId),
  index('seed_allocations_zone_idx').on(t.zoneId),
  index('seed_allocations_seedtype_idx').on(t.seedType),
]);

// Seed distributions: proof of handover and verification data
export const seedDistributions = marketplaceSchema.table('seed_distributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  allocationId: uuid('allocation_id').notNull(),
  producerId: uuid('producer_id').notNull(),
  agentId: uuid('agent_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  zoneId: uuid('zone_id').notNull(),
  quantity: integer('quantity').notNull(),
  cnibProvided: text('cnib_provided'),
  verificationCodeHash: text('verification_code_hash'),
  verificationCodeExpiresAt: timestamp('verification_code_expires_at'),
  verificationChannel: text('verification_channel').default('IN_APP'),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  status: text('status').default('PENDING').notNull(),
  receiptAt: timestamp('receipt_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('seed_distributions_alloc_idx').on(t.allocationId),
  index('seed_distributions_producer_idx').on(t.producerId),
  index('seed_distributions_agent_idx').on(t.agentId),
  index('seed_distributions_status_idx').on(t.status),
]);

// Attempts for verification (success or failure) — useful for antifraud and rate-limiting
export const seedDistributionAttempts = marketplaceSchema.table('seed_distribution_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionId: uuid('distribution_id').notNull(),
  actorId: uuid('actor_id'),
  attemptType: text('attempt_type'),
  success: boolean('success').default(false).notNull(),
  ipAddress: text('ip_address'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('sda_distribution_idx').on(t.distributionId),
  index('sda_actor_idx').on(t.actorId),
]);

export default {
  seedAllocations,
  seedDistributions,
  seedDistributionAttempts,
};

// Types
export type SeedAllocation = InferModel<typeof seedAllocations>;
export type SeedDistribution = InferModel<typeof seedDistributions>;
export type SeedDistributionAttempt = InferModel<typeof seedDistributionAttempts>;
