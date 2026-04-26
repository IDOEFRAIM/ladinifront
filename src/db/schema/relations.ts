/**
 * DRIZZLE RELATIONS — AgriConnect v3
 * ══════════════════════════════════════════════════════════════════════════
 * All relations are defined centrally here to:
 *   1. Avoid circular import issues between schema files
 *   2. Enable `db.query.X.findMany({ with: { ... } })` across the codebase
 *   3. Provide a single source of truth for relation metadata
 *
 * Every `with:` used in services/API routes MUST have a corresponding
 * relation defined here, otherwise Drizzle will throw:
 *   "Cannot read properties of undefined (reading 'referencedTable')"
 */

import { relations } from 'drizzle-orm';

// ── Auth tables ──
import { users, accounts, sessions } from './auth';

// ── Governance tables ──
import {
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
} from './governance';

// ── Marketplace tables ──
import {
  warehouses,
  producers,
  clients,
  farms,
  cropCycles,
  stocks,
  stockMovements,
  batches,
  expenses,
  products,
  orders,
  orderItems,
  auctions,
  bids,
} from './marketplace';

// Inventory / distribution tables
import {
  seedAllocations,
  seedDistributions,
  seedDistributionAttempts,
} from './inventory';

// ── Intelligence tables ──
import {
  auditLogs,
  agentActions,
  agentTelemetry,
  conversations,
  anomalies,
  trustScores,
  aiRatingReasonings,
  territoryEvents,
} from './intelligence';

// ╔══════════════════════════════════════════════╗
// ║  AUTH RELATIONS                               ║
// ╚══════════════════════════════════════════════╝

export const usersRelations = relations(users, ({ one, many }) => ({
  producer: one(producers, {
    fields: [users.id],
    references: [producers.userId],
  }),
  userOrganizations: many(userOrganizations),
  trustScore: one(trustScores, {
    fields: [users.id],
    references: [trustScores.userId],
  }),
}));

// ╔══════════════════════════════════════════════╗
// ║  GOVERNANCE RELATIONS                         ║
// ╚══════════════════════════════════════════════╝

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  dynRole: one(roleDefs, {
    fields: [userOrganizations.roleId],
    references: [roleDefs.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [userOrganizations.userId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [userOrganizations.managedZoneId],
    references: [zones.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(userOrganizations),
  workZones: many(workZones),
}));

export const climaticRegionsRelations = relations(climaticRegions, ({ many }) => ({
  zones: many(zones),
}));

export const zonesRelations = relations(zones, ({ one, many }) => ({
  climaticRegion: one(climaticRegions, {
    fields: [zones.climaticRegionId],
    references: [climaticRegions.id],
  }),
  organization: one(organizations, {
    fields: [zones.organizationId],
    references: [organizations.id],
  }),
  parent: one(zones, {
    fields: [zones.parentId],
    references: [zones.id],
    relationName: 'zoneParent',
  }),
  children: many(zones, { relationName: 'zoneParent' }),
  producers: many(producers),
  farms: many(farms),
  orders: many(orders),
}));

export const workZonesRelations = relations(workZones, ({ one }) => ({
  zone: one(zones, {
    fields: [workZones.zoneId],
    references: [zones.id],
  }),
  manager: one(users, {
    fields: [workZones.managerId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [workZones.organizationId],
    references: [organizations.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  subCategories: many(subCategories),
}));

export const subCategoriesRelations = relations(subCategories, ({ one, many }) => ({
  category: one(categories, {
    fields: [subCategories.categoryId],
    references: [categories.id],
  }),
  standardPrices: many(standardPrices),
}));

export const standardPricesRelations = relations(standardPrices, ({ one }) => ({
  subCategory: one(subCategories, {
    fields: [standardPrices.subCategoryId],
    references: [subCategories.id],
  }),
  zone: one(zones, {
    fields: [standardPrices.zoneId],
    references: [zones.id],
  }),
}));

// ╔══════════════════════════════════════════════╗
// ║  MARKETPLACE RELATIONS                        ║
// ╚══════════════════════════════════════════════╝

export const producersRelations = relations(producers, ({ one, many }) => ({
  user: one(users, {
    fields: [producers.userId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [producers.zoneId],
    references: [zones.id],
  }),
  organization: one(organizations, {
    fields: [producers.organizationId],
    references: [organizations.id],
  }),
  farms: many(farms),
  products: many(products),
  clients: many(clients),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  producer: one(producers, {
    fields: [clients.producerId],
    references: [producers.id],
  }),
}));

export const farmsRelations = relations(farms, ({ one, many }) => ({
  producer: one(producers, {
    fields: [farms.producerId],
    references: [producers.id],
  }),
  zone: one(zones, {
    fields: [farms.zoneId],
    references: [zones.id],
  }),
  // Named "inventory" to match the `with: { inventory: true }` used in dashboard routes
  inventory: many(stocks),
  cropCycles: many(cropCycles),
  expenses: many(expenses),
}));

export const cropCyclesRelations = relations(cropCycles, ({ one }) => ({
  farm: one(farms, {
    fields: [cropCycles.farmId],
    references: [farms.id],
  }),
}));

export const stocksRelations = relations(stocks, ({ one, many }) => ({
  farm: one(farms, {
    fields: [stocks.farmId],
    references: [farms.id],
  }),
  warehouse: one(warehouses, {
    fields: [stocks.warehouseId],
    references: [warehouses.id],
  }),
  movements: many(stockMovements),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  stock: one(stocks, {
    fields: [stockMovements.stockId],
    references: [stocks.id],
  }),
}));

export const batchesRelations = relations(batches, ({ one }) => ({
  stock: one(stocks, {
    fields: [batches.stockId],
    references: [stocks.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  farm: one(farms, {
    fields: [expenses.farmId],
    references: [farms.id],
  }),
}));

export const productsRelations = relations(products, ({ one }) => ({
  producer: one(producers, {
    fields: [products.producerId],
    references: [producers.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [orders.zoneId],
    references: [zones.id],
  }),
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const auctionsRelations = relations(auctions, ({ one, many }) => ({
  buyer: one(users, {
    fields: [auctions.buyerId],
    references: [users.id],
  }),
  subCategory: one(subCategories, {
    fields: [auctions.subCategoryId],
    references: [subCategories.id],
  }),
  targetZone: one(zones, {
    fields: [auctions.targetZoneId],
    references: [zones.id],
  }),
  bids: many(bids),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  auction: one(auctions, {
    fields: [bids.auctionId],
    references: [auctions.id],
  }),
  producer: one(producers, {
    fields: [bids.producerId],
    references: [producers.id],
  }),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  zone: one(zones, {
    fields: [warehouses.zoneId],
    references: [zones.id],
  }),
  stocks: many(stocks),
}));

export const seedAllocationsRelations = relations(seedAllocations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [seedAllocations.organizationId],
    references: [organizations.id],
  }),
  zone: one(zones, {
    fields: [seedAllocations.zoneId],
    references: [zones.id],
  }),
  allocatedBy: one(users, {
    fields: [seedAllocations.allocatedById],
    references: [users.id],
  }),
  distributions: many(seedDistributions),
}));

export const seedDistributionsRelations = relations(seedDistributions, ({ one, many }) => ({
  allocation: one(seedAllocations, {
    fields: [seedDistributions.allocationId],
    references: [seedAllocations.id],
  }),
  producer: one(producers, {
    fields: [seedDistributions.producerId],
    references: [producers.id],
  }),
  agent: one(users, {
    fields: [seedDistributions.agentId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [seedDistributions.organizationId],
    references: [organizations.id],
  }),
  zone: one(zones, {
    fields: [seedDistributions.zoneId],
    references: [zones.id],
  }),
  attempts: many(seedDistributionAttempts),
}));

export const seedDistributionAttemptsRelations = relations(seedDistributionAttempts, ({ one }) => ({
  distribution: one(seedDistributions, {
    fields: [seedDistributionAttempts.distributionId],
    references: [seedDistributions.id],
  }),
  actor: one(users, {
    fields: [seedDistributionAttempts.actorId],
    references: [users.id],
  }),
}));

// ╔══════════════════════════════════════════════╗
// ║  INTELLIGENCE RELATIONS                       ║
// ╚══════════════════════════════════════════════╝

export const agentActionsRelations = relations(agentActions, ({ one }) => ({
  order: one(orders, {
    fields: [agentActions.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [agentActions.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [conversations.zoneId],
    references: [zones.id],
  }),
}));

export const trustScoresRelations = relations(trustScores, ({ one, many }) => ({
  user: one(users, {
    fields: [trustScores.userId],
    references: [users.id],
  }),
  reasonings: many(aiRatingReasonings),
}));

export const aiRatingReasoningsRelations = relations(aiRatingReasonings, ({ one }) => ({
  trustScore: one(trustScores, {
    fields: [aiRatingReasonings.trustScoreId],
    references: [trustScores.id],
  }),
}));

export const anomaliesRelations = relations(anomalies, ({ one }) => ({
  zone: one(zones, {
    fields: [anomalies.zoneId],
    references: [zones.id],
  }),
}));

export const territoryEventsRelations = relations(territoryEvents, ({ one }) => ({
  zone: one(zones, {
    fields: [territoryEvents.zoneId],
    references: [zones.id],
  }),
}));