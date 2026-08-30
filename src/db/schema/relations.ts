/**
 * DRIZZLE RELATIONS — AgriConnect Marketplace
 * ══════════════════════════════════════════════════════════════════════════
 * Toutes les relations « conseil » (crop cycles agronomiques, capteurs, météo,
 * recommandations, anomalies, territoire, semences) ont été supprimées.
 * `crop_cycles` → `market_offers`.
 */

import { relations } from 'drizzle-orm';

// ── Auth tables ──
import { users } from './auth';

// ── Governance tables ──
import {
  organizations,
  userOrganizations,
  roleDefs,
  climaticRegions,
  zones,
  workZones,
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
  marketOffers,
  stocks,
  stockMovements,
  batches,
  expenses,
  products,
  orders,
  orderItems,
  payments,
  orderStatusHistory,
  orderReminders,
  orderDisputes,
  auctions,
  bids,
  marketplaceRatings,
  seedAllocations,
  seedDistributions,
  seedDistributionAttempts,
} from './marketplace';

// ── Intelligence tables ──
import {
  agentActions,
  conversations,
  trustScores,
  aiRatingReasonings,
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
  marketOffers: many(marketOffers),
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
  marketOffers: many(marketOffers),
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
  marketOffers: many(marketOffers),
  expenses: many(expenses),
}));

export const marketOffersRelations = relations(marketOffers, ({ one, many }) => ({
  producer: one(producers, {
    fields: [marketOffers.producerId],
    references: [producers.id],
  }),
  farm: one(farms, {
    fields: [marketOffers.farmId],
    references: [farms.id],
  }),
  subCategory: one(subCategories, {
    fields: [marketOffers.subCategoryId],
    references: [subCategories.id],
  }),
  preorders: many(orders),
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

export const productsRelations = relations(products, ({ one, many }) => ({
  producer: one(producers, {
    fields: [products.producerId],
    references: [producers.id],
  }),
  subCategory: one(subCategories, {
    fields: [products.subCategoryId],
    references: [subCategories.id],
  }),
  orderItems: many(orderItems),
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
  marketOffer: one(marketOffers, {
    fields: [orders.marketOfferId],
    references: [marketOffers.id],
  }),
  delivery: one(deliveries, {
    fields: [orders.id],
    references: [deliveries.orderId],
  }),
  items: many(orderItems),
  payments: many(payments),
  statusHistory: many(orderStatusHistory),
  reminders: many(orderReminders),
  disputes: many(orderDisputes),
  ratings: many(marketplaceRatings),
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

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const orderRemindersRelations = relations(orderReminders, ({ one }) => ({
  order: one(orders, {
    fields: [orderReminders.orderId],
    references: [orders.id],
  }),
}));

export const orderDisputesRelations = relations(orderDisputes, ({ one }) => ({
  order: one(orders, {
    fields: [orderDisputes.orderId],
    references: [orders.id],
  }),
}));

export const marketplaceRatingsRelations = relations(marketplaceRatings, ({ one }) => ({
  order: one(orders, {
    fields: [marketplaceRatings.orderId],
    references: [orders.id],
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

// ╔══════════════════════════════════════════════╗
// ║  INTELLIGENCE RELATIONS (agent persistence)   ║
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

export const agentContextMemoryRelations = relations(agentContextMemory, ({ one }) => ({
  user: one(users, {
    fields: [agentContextMemory.userId],
    references: [users.id],
  }),
  marketOffer: one(marketOffers, {
    fields: [agentContextMemory.marketOfferId],
    references: [marketOffers.id],
  }),
}));

// ── Seed allocations / distributions (restauré 2026-08-27, voir marketplace.ts) ──
export const seedAllocationsRelations = relations(seedAllocations, ({ one, many }) => ({
  zone: one(zones, {
    fields: [seedAllocations.zoneId],
    references: [zones.id],
  }),
  organization: one(organizations, {
    fields: [seedAllocations.organizationId],
    references: [organizations.id],
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
}));
