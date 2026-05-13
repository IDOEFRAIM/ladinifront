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
  buyerTypes,
  buyerProfiles,
  deliveryAgents,
  deliveries,
  farms,
  cropCycles,
  fieldInterventions,
  sensorDataSummary,
  soilProfiles,
  sensorTelemetryHistory,
  cropGrowthLogs,
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
  aiRecommendations,
  weatherDataLogs,
  agentContextMemory,
} from './intelligence';

// ╔══════════════════════════════════════════════╗
// ║  AUTH RELATIONS                               ║
// ╚══════════════════════════════════════════════╝

export const usersRelations = relations(users, ({ one, many }) => ({
  producer: one(producers, {
    fields: [users.id],
    references: [producers.userId],
  }),
  buyerProfile: one(buyerProfiles, {
    fields: [users.id],
    references: [buyerProfiles.userId],
  }),
  deliveryAgent: one(deliveryAgents, {
    fields: [users.id],
    references: [deliveryAgents.userId],
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

  inventory: many(stocks),
  cropCycles: many(cropCycles),
  expenses: many(expenses),
  soilProfiles: many(soilProfiles),
  sensorTelemetry: many(sensorTelemetryHistory),
  cycles: many(cropCycles),
  telemetryHistory: many(sensorTelemetryHistory),
  sensorSummaries: many(sensorDataSummary),
}));

export const cropCyclesRelations = relations(cropCycles, ({ one, many }) => ({
  farm: one(farms, {
    fields: [cropCycles.farmId],
    references: [farms.id],
  }),
  interventions: many(fieldInterventions),
  growthLogs: many(cropGrowthLogs),
  recommendations: many(aiRecommendations),
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
  buyerProfile: one(buyerProfiles, {
    fields: [orders.buyerId],
    references: [buyerProfiles.id],
  }),
  zone: one(zones, {
    fields: [orders.zoneId],
    references: [zones.id],
  }),
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  auction: one(auctions, {
    fields: [orders.auctionId],
    references: [auctions.id],
  }),
  winningBid: one(bids, {
    fields: [orders.winningBidId],
    references: [bids.id],
  }),
  delivery: one(deliveries, {
    fields: [orders.id],
    references: [deliveries.orderId],
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
  winnerBid: one(bids, {
    fields: [auctions.winnerBidId],
    references: [bids.id],
  }),
  bids: many(bids),
  orders: many(orders),
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
  linkedStock: one(stocks, {
    fields: [bids.linkedStockId],
    references: [stocks.id],
  }),
}));

export const buyerTypesRelations = relations(buyerTypes, ({ many }) => ({
  profiles: many(buyerProfiles),
}));

export const buyerProfilesRelations = relations(buyerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [buyerProfiles.userId],
    references: [users.id],
  }),
  buyerType: one(buyerTypes, {
    fields: [buyerProfiles.buyerTypeId],
    references: [buyerTypes.id],
  }),
  orders: many(orders),
}));

export const deliveryAgentsRelations = relations(deliveryAgents, ({ one, many }) => ({
  user: one(users, {
    fields: [deliveryAgents.userId],
    references: [users.id],
  }),
  zone: one(zones, {
    fields: [deliveryAgents.zoneId],
    references: [zones.id],
  }),
  deliveries: many(deliveries),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, {
    fields: [deliveries.orderId],
    references: [orders.id],
  }),
  agent: one(deliveryAgents, {
    fields: [deliveries.deliveryAgentId],
    references: [deliveryAgents.id],
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

// ══════════════════════════════════════════════
//   AGTECH RELATIONS
// ══════════════════════════════════════════════

export const fieldInterventionsRelations = relations(fieldInterventions, ({ one }) => ({
  cropCycle: one(cropCycles, {
    fields: [fieldInterventions.cropCycleId],
    references: [cropCycles.id],
  }),
}));

export const cropGrowthLogsRelations = relations(cropGrowthLogs, ({ one }) => ({
  cropCycle: one(cropCycles, {
    fields: [cropGrowthLogs.cropCycleId],
    references: [cropCycles.id],
  }),
}));

export const soilProfilesRelations = relations(soilProfiles, ({ one }) => ({
  farm: one(farms, {
    fields: [soilProfiles.farmId],
    references: [farms.id],
  }),
}));

export const sensorTelemetryHistoryRelations = relations(sensorTelemetryHistory, ({ one }) => ({
  farm: one(farms, {
    fields: [sensorTelemetryHistory.farmId],
    references: [farms.id],
  }),
}));

export const sensorDataSummaryRelations = relations(sensorDataSummary, ({ one }) => ({
  farm: one(farms, {
    fields: [sensorDataSummary.farmId],
    references: [farms.id],
  }),
}));

// ══════════════════════════════════════════════
//   AI BRAIN RELATIONS
// ══════════════════════════════════════════════

export const aiRecommendationsRelations = relations(aiRecommendations, ({ one }) => ({
  user: one(users, {
    fields: [aiRecommendations.userId],
    references: [users.id],
  }),
}));

export const weatherDataLogsRelations = relations(weatherDataLogs, ({ one }) => ({
  zone: one(zones, {
    fields: [weatherDataLogs.zoneId],
    references: [zones.id],
  }),
}));

export const agentContextMemoryRelations = relations(agentContextMemory, ({ one }) => ({
  user: one(users, {
    fields: [agentContextMemory.userId],
    references: [users.id],
  }),
}));