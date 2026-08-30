/**
 * MARKETPLACE SCHEMA — Marketplace transactionnelle pure
 * ══════════════════════════════════════════════════════════════════════════
 * Bloc « AgTech » SUPPRIMÉ (field_interventions, sensor_data_summary,
 * agronomic_standards, pest_disease_catalog, soil_profiles,
 * sensor_telemetry_history, crop_growth_logs, crop_growth_stages).
 *
 * `crop_cycles` → `market_offers` (structure de prévente dégraissée).
 * `farms` dégraissée (sol/eau/capteurs retirés).
 *
 * Ajouts proactifs (fluidité transactionnelle) :
 *   - `payments`            : journal de paiements (audit, retries, escrow)
 *   - `order_status_history`: traçabilité fine Commande→Paiement→Livraison
 *   - `order_reminders`     : relances automatiques (paiement, confirmation, avis)
 *   - `marketplace_ratings` : réputation post-transaction (manquait côté Drizzle)
 */
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
  varchar,
  real,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  marketplaceSchema,
  producerStatusEnum,
  deliveryAgentStatusEnum,
  deliveryStatusEnum,
  unitEnum,
  stockTypeEnum,
  movementTypeEnum,
  expenseCategoryEnum,
  auctionStatusEnum,
  escrowStatusEnum,
} from './_config';
import { type InferModel } from 'drizzle-orm';
import { zones, organizations } from './governance';
import { users } from './auth';

// ── WAREHOUSES ─────────────────────────────────────────────────────────────
export const warehouses = marketplaceSchema.table('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  capacity: doublePrecision('capacity'),
  location: text('location'),
  zoneId: uuid('zone_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('warehouses_zone_idx').on(t.zoneId),
]);

// ── PRODUCERS ──────────────────────────────────────────────────────────────
export const producers = marketplaceSchema.table('producers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(),
  organizationId: uuid('organization_id'),
  businessName: text('business_name'),
  status: producerStatusEnum('status').default('PENDING').notNull(),
  isCertified: boolean('is_certified').default(false).notNull(),
  zoneId: uuid('zone_id'),
  region: text('region'),
  province: text('province'),
  commune: text('commune'),
  logoUrl: text('logo_url'),
  phoneNumber: text('phone_number'),
  rating: integer('rating'),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  companyRegistrationNumber: text('company_registration_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('producers_status_idx').on(t.status),
  index('producers_org_idx').on(t.organizationId),
  index('producers_zone_idx').on(t.zoneId),
]);

// ── CLIENTS (carnet du producteur) ─────────────────────────────────────────
export const clients = marketplaceSchema.table('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  location: text('location'),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: doublePrecision('total_spent').default(0).notNull(),
  lastOrderDate: timestamp('last_order_date'),
  taxId: text('tax_id'),
  preferedPayementMethod: jsonb('prefered_payement_method'),
  producerId: uuid('producer_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('clients_phone_idx').on(t.phone),
  index('clients_name_idx').on(t.name),
  index('clients_producer_idx').on(t.producerId),
]);

// ── BUYERS (segmentation B2B) ──────────────────────────────────────────────
export const buyerTypes = marketplaceSchema.table('buyer_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const buyerProfiles = marketplaceSchema.table('buyer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(),
  buyerTypeId: uuid('buyer_type_id'),
  establishmentName: text('establishment_name'),
  defaultDeliveryAddress: text('default_delivery_address'),
  isVerified: boolean('is_verified').default(false).notNull(),
  trustBadge: text('trust_badge'),
  rating: doublePrecision('rating'),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  companyRegistrationNumber: text('company_registration_number'),
  verifiedAt: timestamp('verified_at'),
  verifiedById: uuid('verified_by_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('buyer_profiles_user_idx').on(t.userId),
  index('buyer_profiles_type_idx').on(t.buyerTypeId),
  index('buyer_profiles_verified_idx').on(t.isVerified),
]);

// ── DELIVERIES (logistique) ────────────────────────────────────────────────
export const deliveryAgents = marketplaceSchema.table('delivery_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(),
  vehicleType: text('vehicle_type'),
  licenseNumber: text('license_number'),
  zoneId: uuid('zone_id'),
  status: deliveryAgentStatusEnum('status').default('OFFLINE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('delivery_agents_zone_idx').on(t.zoneId),
  index('delivery_agents_status_idx').on(t.status),
]);

export const deliveries = marketplaceSchema.table('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  deliveryAgentId: uuid('delivery_agent_id'),
  status: deliveryStatusEnum('status').default('PENDING').notNull(),
  deliveryCode: text('delivery_code'),
  originGpsLat: doublePrecision('origin_gps_lat'),
  originGpsLng: doublePrecision('origin_gps_lng'),
  destinationGpsLat: doublePrecision('destination_gps_lat'),
  destinationGpsLng: doublePrecision('destination_gps_lng'),
  destinationDesc: text('destination_desc'),
  estimatedDistanceKm: doublePrecision('estimated_distance_km'),
  // Ajouts : suivi fin de la livraison + preuve
  actualDistanceKm: doublePrecision('actual_distance_km'),
  shippingCondition: text('shipping_condition'),
  proofOfDeliveryUrl: text('proof_of_delivery_url'),
  assignedAt: timestamp('assigned_at'),
  pickedUpAt: timestamp('picked_up_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('deliveries_order_unique').on(t.orderId),
  index('deliveries_agent_idx').on(t.deliveryAgentId),
  index('deliveries_status_idx').on(t.status),
  // Optimisation : file d'un agent triée par statut
  index('deliveries_agent_status_idx').on(t.deliveryAgentId, t.status),
]);

// ── FARMS (dégraissée : localité + rattachement producteur) ────────────────
export const farms = marketplaceSchema.table('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  size: doublePrecision('size'),
  zoneId: uuid('zone_id').references(() => zones.id),
  producerId: uuid('producer_id').notNull().references(() => producers.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('farms_producer_idx').on(t.producerId),
  index('farms_zone_idx').on(t.zoneId),
]);

// ── MARKET OFFERS (ex crop_cycles) : offre de vente / prévente ─────────────
export const marketOffers = marketplaceSchema.table('market_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  producerId: uuid('producer_id').notNull().references(() => producers.id), // dénormalisé (catalogue direct)
  farmId: uuid('farm_id').references(() => farms.id),
  subCategoryId: uuid('sub_category_id'),

  // Identité de l'offre
  productLabel: text('product_label').notNull(),           // ex-cropType
  productionType: text('production_type').default('CROP').notNull(),
  species: text('species'),
  breed: text('breed'),

  // Disponibilité & prix (Decimal côté DB via numeric)
  unit: unitEnum('unit').default('KG').notNull(),
  pricePerUnit: numeric('price_per_unit', { precision: 12, scale: 2 }),
  availableQuantity: numeric('available_quantity', { precision: 14, scale: 3 }).default('0').notNull(),
  reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 3 }).default('0').notNull(),
  currentStock: numeric('current_stock', { precision: 14, scale: 3 }).default('0').notNull(),

  // Mécanique de prévente
  isPublic: boolean('is_public').default(false).notNull(),
  preorderEnabled: boolean('preorder_enabled').default(false).notNull(),
  estimatedAvailableAt: timestamp('estimated_available_at'),
  expectedHarvestDate: timestamp('expected_harvest_date'),
  status: text('status').default('DRAFT').notNull(),       // DRAFT→PUBLISHED→SOLD_OUT→CLOSED

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('market_offers_producer_idx').on(t.producerId),
  index('market_offers_farm_idx').on(t.farmId),
  index('market_offers_subcategory_idx').on(t.subCategoryId),
  index('market_offers_available_at_idx').on(t.estimatedAvailableAt),
  // Optimisation : catalogue public = filtrer isPublic + status (index composite)
  index('market_offers_public_status_idx').on(t.isPublic, t.status),
  index('market_offers_preorder_idx').on(t.preorderEnabled),
]);

// ── STOCKS (inventaire atomique) ───────────────────────────────────────────
export const stocks = marketplaceSchema.table('stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id'),
  warehouseId: uuid('warehouse_id'),
  organizationId: uuid('organization_id'),
  verifiedById: uuid('verified_by_id'),
  itemName: text('item_name').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).default('0').notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  type: stockTypeEnum('type').default('HARVEST').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('stocks_farm_idx').on(t.farmId),
  index('stocks_warehouse_idx').on(t.warehouseId),
  index('stocks_org_idx').on(t.organizationId),
  index('stocks_type_idx').on(t.type),
  index('stocks_verifier_idx').on(t.verifiedById),
]);

export const stockMovements = marketplaceSchema.table('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  stockId: uuid('stock_id').notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('stock_movements_stock_idx').on(t.stockId),
  index('stock_movements_created_idx').on(t.createdAt),
]);

export const batches = marketplaceSchema.table('batches', {
  id: uuid('id').primaryKey().defaultRandom(),
  stockId: uuid('stock_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  batchNumber: text('batch_number').unique().notNull(),
  originFarmId: uuid('origin_farm_id'),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('batches_stock_idx').on(t.stockId),
  index('batches_org_idx').on(t.organizationId),
]);

export const expenses = marketplaceSchema.table('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull(),
  label: text('label').notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  category: expenseCategoryEnum('category').default('OTHER').notNull(),
  date: timestamp('date').defaultNow().notNull(),
}, (t) => [
  index('expenses_farm_idx').on(t.farmId),
  index('expenses_category_idx').on(t.category),
  index('expenses_date_idx').on(t.date),
]);

// ── PRODUCTS (catalogue) ───────────────────────────────────────────────────
export const products = marketplaceSchema.table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  shortCode: text('short_code').unique(),
  name: text('name').default('Produit').notNull(),
  categoryLabel: text('category_label').notNull(),
  subCategoryId: uuid('sub_category_id'),
  localNames: jsonb('local_names'),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  quantityForSale: numeric('quantity_for_sale', { precision: 14, scale: 3 }).default('0').notNull(),
  // Déclinaisons de prix/conditionnement pour un MÊME produit (2026-08-27,
  // ex: "500f le demi-litre en sachet et 600f le bidon") — miroir exact de
  // `Product.pricing_tiers` côté backend (domain/catalog/models.py) : liste
  // de {quantity, unit, price, packaging}. `unit` y est TOUJOURS littéral,
  // jamais normalisé. NULL = produit à tarif unique (comportement
  // historique, colonnes price/unit/quantityForSale ci-dessus).
  pricingTiers: jsonb('pricing_tiers'),
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  audioUrl: text('audio_url'),
  qualityClass: text('quality_class'),
  minOrderQuality: text('min_order_quality'),
  packagingType: text('packaging_type'),
  harvestDate: timestamp('harvest_date'),
  isAvailable: boolean('is_available').default(true).notNull(),
  producerId: uuid('producer_id').notNull().references(() => producers.id),
  verifiedAt: timestamp('verified_at'),
  verifiedById: uuid('verified_by_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('products_producer_idx').on(t.producerId),
  index('products_category_idx').on(t.categoryLabel),
  index('products_subcategory_idx').on(t.subCategoryId),
  index('products_price_idx').on(t.price),
  index('products_created_idx').on(t.createdAt),
  index('products_verifier_idx').on(t.verifiedById),
  // Optimisation : la jointure/filtre le plus fréquent = produits dispo d'un producteur
  index('products_producer_available_idx').on(t.producerId, t.isAvailable),
  index('products_category_available_idx').on(t.categoryLabel, t.isAvailable),
]);

// ── ORDERS (Commande→Paiement→Livraison→Confirmation) ──────────────────────
export const orders = marketplaceSchema.table('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id').references(() => buyerProfiles.id),
  clientId: uuid('client_id').references(() => clients.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  zoneId: uuid('zone_id').references(() => zones.id),

  customerName: varchar('customer_name'),
  customerPhone: varchar('customer_phone'),
  paymentMethod: varchar('payment_method').default('CASH').notNull(),
  paymentStatus: varchar('payment_status').default('PENDING').notNull(),
  city: varchar('city'),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
  deliveryDesc: text('delivery_desc'),
  audioUrl: varchar('audio_url'),
  status: varchar('status').default('PENDING').notNull(),
  deliveryStatus: varchar('delivery_status').default('PENDING').notNull(),
  source: varchar('source').default('APP').notNull(),
  whatsappId: varchar('whatsapp_id'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  isAgentOrder: boolean('is_agent_order').default(false).notNull(),

  deliveryDate: timestamp('delivery_date'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).default('0').notNull(),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  currency: varchar('currency').default('XOF').notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  cancellationRole: varchar('cancellation_role'),
  escrowWalletId: uuid('escrow_wallet_id'),

  auctionId: uuid('auction_id').references(() => auctions.id),
  winningBidId: uuid('winning_bid_id').references(() => bids.id),

  orderType: varchar('order_type').default('STANDARD').notNull(),
  marketOfferId: uuid('market_offer_id').references(() => marketOffers.id), // ex crop_cycle_id (prévente)
  expectedFulfillmentDate: timestamp('expected_fulfillment_date'),
  preorderConvertedAt: timestamp('preorder_converted_at'),

  // Ajout : timestamp de confirmation de réception (clôture du cycle)
  confirmedAt: timestamp('confirmed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('orders_buyer_idx').on(t.buyerId),
  index('orders_org_idx').on(t.organizationId),
  index('orders_status_idx').on(t.status),
  index('orders_delivery_status_idx').on(t.deliveryStatus),
  index('orders_zone_idx').on(t.zoneId),
  index('orders_created_idx').on(t.createdAt),
  index('orders_phone_idx').on(t.customerPhone),
  uniqueIndex('orders_auction_unique').on(t.auctionId),
  index('orders_winning_bid_idx').on(t.winningBidId),
  index('orders_type_idx').on(t.orderType),
  index('orders_market_offer_idx').on(t.marketOfferId),
  // Optimisation : tableau de bord acheteur = commandes d'un acheteur triées par état
  index('orders_buyer_status_idx').on(t.buyerId, t.status),
  index('orders_payment_status_idx').on(t.paymentStatus),
]);

export const orderItems = marketplaceSchema.table('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  priceAtSale: numeric('price_at_sale', { precision: 12, scale: 2 }).notNull(),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
  index('order_items_product_idx').on(t.productId),
]);

// ── PAYMENTS (journal de paiement — ajout) ─────────────────────────────────
export const payments = marketplaceSchema.table('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: varchar('currency').default('XOF').notNull(),
  method: varchar('method').default('CASH').notNull(),        // CASH, MOBILE_MONEY, CARD, ESCROW
  status: varchar('status').default('PENDING').notNull(),     // PENDING→AUTHORIZED→CAPTURED→FAILED→REFUNDED
  provider: varchar('provider'),                               // ORANGE_MONEY, WAVE, STRIPE…
  providerRef: varchar('provider_ref'),                        // idempotence / réconciliation
  escrowWalletId: uuid('escrow_wallet_id'),
  failureReason: text('failure_reason'),
  authorizedAt: timestamp('authorized_at'),
  capturedAt: timestamp('captured_at'),
  refundedAt: timestamp('refunded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('payments_order_idx').on(t.orderId),
  index('payments_status_idx').on(t.status),
  uniqueIndex('payments_provider_ref_unique').on(t.providerRef),
]);

// ── ORDER STATUS HISTORY (traçabilité fine — ajout) ────────────────────────
export const orderStatusHistory = marketplaceSchema.table('order_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  statusType: varchar('status_type').notNull(),  // ORDER | PAYMENT | DELIVERY
  fromStatus: varchar('from_status'),
  toStatus: varchar('to_status').notNull(),
  actorId: uuid('actor_id'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('osh_order_idx').on(t.orderId),
  index('osh_order_type_idx').on(t.orderId, t.statusType),
  index('osh_created_idx').on(t.createdAt),
]);

// ── ORDER REMINDERS (relances automatiques — ajout) ────────────────────────
export const orderReminders = marketplaceSchema.table('order_reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  type: varchar('type').notNull(),          // PAYMENT_DUE | CONFIRM_RECEIPT | LEAVE_REVIEW | PREORDER_READY
  channel: varchar('channel').default('WHATSAPP').notNull(),
  status: varchar('status').default('SCHEDULED').notNull(), // SCHEDULED→SENT→CANCELLED→FAILED
  scheduledAt: timestamp('scheduled_at').notNull(),
  sentAt: timestamp('sent_at'),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('order_reminders_order_idx').on(t.orderId),
  // Optimisation : le worker de relance scanne "à envoyer" = status + scheduledAt
  index('order_reminders_due_idx').on(t.status, t.scheduledAt),
]);

// ── ORDER DISPUTES ─────────────────────────────────────────────────────────
export const orderDisputes = marketplaceSchema.table('order_disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  escrowWalletId: uuid('escrow_wallet_id'),
  raisedById: uuid('raised_by_id').notNull(),
  reasonCategory: varchar('reason_category').notNull(),
  description: text('description').notNull(),
  evidenceImages: text('evidence_images').array().notNull().default(sql`'{}'::text[]`),
  requestedSolution: varchar('requested_solution').notNull(),
  disputedAmount: numeric('disputed_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  escrowPayoutStatus: varchar('escrow_payout_status').default('HELD').notNull(),
  status: varchar('status').default('PENDING').notNull(),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('order_disputes_order_idx').on(t.orderId),
  index('order_disputes_status_idx').on(t.status),
  index('order_disputes_raised_by_idx').on(t.raisedById),
  index('order_disputes_escrow_idx').on(t.escrowWalletId),
]);

// ── AUCTIONS ───────────────────────────────────────────────────────────────
export const auctions = marketplaceSchema.table('auctions', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').notNull(),
  subCategoryId: uuid('sub_category_id').notNull(),
  description: text('description'),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unit: unitEnum('unit').default('TONNE').notNull(),
  maxPricePerUnit: numeric('max_price_per_unit', { precision: 12, scale: 2 }).notNull(),
  incoterm: text('incoterm').default('DDP').notNull(),
  deliveryLocation: text('delivery_location').notNull(),
  deliveryDeadline: timestamp('delivery_deadline').notNull(),
  qualityGrading: text('quality_grading'),
  requiredCertifications: text('required_certifications').array().notNull().default(sql`'{}'::text[]`),
  preferredPackaging: text('preferred_packaging'),
  deadline: timestamp('deadline').notNull(),
  autoExtend: boolean('auto_extend').default(true).notNull(),
  escrowStatus: escrowStatusEnum('escrow_status').default('NONE').notNull(),
  status: auctionStatusEnum('status').default('OPEN').notNull(),
  winnerBidId: uuid('winner_bid_id'),
  escrowWalletId: uuid('escrow_wallet_id'),
  awardedAt: timestamp('awarded_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  targetZoneId: uuid('target_zone_id'),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('auctions_status_idx').on(t.status),
  index('auctions_buyer_idx').on(t.buyerId),
  index('auctions_escrow_status_idx').on(t.escrowStatus),
  index('auctions_zone_idx').on(t.targetZoneId),
  index('auctions_deadline_idx').on(t.deadline),
]);

export const bids = marketplaceSchema.table('bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id').notNull(),
  producerId: uuid('producer_id').notNull(),
  offeredPrice: numeric('offered_price', { precision: 12, scale: 2 }).notNull(),
  linkedStockId: uuid('linked_stock_id'),
  isWinner: boolean('is_winner').default(false).notNull(),
  status: text('status').default('PENDING').notNull(),
  message: text('message'),
  notifiedAt: timestamp('notified_at'),
  validUntil: timestamp('valid_until'),
  estimatedDeliveryDate: timestamp('estimated_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('bids_auction_producer_unique').on(t.auctionId, t.producerId),
  index('bids_auction_idx').on(t.auctionId),
  index('bids_producer_idx').on(t.producerId),
  index('bids_linked_stock_idx').on(t.linkedStockId),
  index('bids_status_idx').on(t.status),
]);

// ── MARKETPLACE RATINGS (réputation post-transaction — manquait côté Drizzle)
export const marketplaceRatings = marketplaceSchema.table('marketplace_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  authorType: text('author_type').notNull(),   // BUYER | PRODUCER
  authorId: uuid('author_id').notNull(),
  targetType: text('target_type').notNull(),    // BUYER | PRODUCER
  targetId: uuid('target_id').notNull(),
  ratingProductQuality: integer('rating_product_quality'),
  ratingPackaging: integer('rating_packaging'),
  ratingReceptionSpeed: integer('rating_reception_speed'),
  ratingCommunication: integer('rating_communication'),
  ratingReliability: integer('rating_reliability').notNull(),
  globalRating: doublePrecision('global_rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('mr_order_idx').on(t.orderId),
  index('mr_author_idx').on(t.authorId),
  index('mr_target_idx').on(t.targetId),
  uniqueIndex('mr_order_author_unique').on(t.orderId, t.authorId),
]);

// ── SEED ALLOCATIONS (stock d'intrants alloué à une organisation/zone) ─────
// Restauré (2026-08-27) : présent dans la base réelle et activement utilisé
// par services/seedDistribution.service.ts + services/org-manager.service.ts
// (distribution d'intrants agricoles aux producteurs, avec vérification OTP
// par l'agent terrain/livreur) — jamais porté ici lors du nettoyage initial
// du schéma modulaire, ce qui cassait la compilation de ces deux services.
export const seedAllocations = marketplaceSchema.table('seed_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  zoneId: uuid('zone_id').notNull().references(() => zones.id),
  seedType: text('seed_type').notNull(),
  totalQuantity: numeric('total_quantity', { precision: 14, scale: 3 }).notNull(),
  remainingQuantity: numeric('remaining_quantity', { precision: 14, scale: 3 }).notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  allocatedById: uuid('allocated_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('seed_allocations_org_idx').on(t.organizationId),
  index('seed_allocations_zone_idx').on(t.zoneId),
]);

// ── SEED DISTRIBUTIONS (remise d'intrants à un producteur, vérifiée OTP) ───
export const seedDistributions = marketplaceSchema.table('seed_distributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  allocationId: uuid('allocation_id').notNull().references(() => seedAllocations.id),
  producerId: uuid('producer_id').notNull().references(() => producers.id),
  agentId: uuid('agent_id').notNull().references(() => users.id),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  zoneId: uuid('zone_id').notNull().references(() => zones.id),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  cnibProvided: text('cnib_provided'),
  verificationCodeHash: text('verification_code_hash'),
  verificationCodeExpiresAt: timestamp('verification_code_expires_at'),
  verificationChannel: text('verification_channel').default('IN_APP').notNull(),
  attemptsCount: integer('attempts_count').default(0).notNull(),
  // PENDING → COMPLETED | FAILED | CANCELLED — voir lib/distributionStateMachine.ts
  // (source unique de vérité des transitions, pas une pg-enum ici : cohérent
  // avec le reste du schéma marketplace, ex. orders.status/deliveries.status).
  status: text('status').default('PENDING').notNull(),
  metadata: jsonb('metadata'), // { salt, cnibUrl? }
  receiptAt: timestamp('receipt_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('seed_distributions_allocation_idx').on(t.allocationId),
  index('seed_distributions_producer_idx').on(t.producerId),
  index('seed_distributions_agent_idx').on(t.agentId),
  index('seed_distributions_org_idx').on(t.organizationId),
  index('seed_distributions_status_idx').on(t.status),
]);

// ── SEED DISTRIBUTION ATTEMPTS (journal des tentatives de code OTP) ────────
export const seedDistributionAttempts = marketplaceSchema.table('seed_distribution_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionId: uuid('distribution_id').notNull().references(() => seedDistributions.id),
  actorId: uuid('actor_id').notNull(),
  attemptType: text('attempt_type').notNull(),
  success: boolean('success').notNull(),
  ipAddress: text('ip_address'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('seed_dist_attempts_distribution_idx').on(t.distributionId),
]);

export default {
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
};

// Types
export type Producer = InferModel<typeof producers>;
export type Product = InferModel<typeof products>;
export type Order = InferModel<typeof orders>;
export type OrderItem = InferModel<typeof orderItems>;
export type Payment = InferModel<typeof payments>;
export type OrderStatusHistory = InferModel<typeof orderStatusHistory>;
export type OrderReminder = InferModel<typeof orderReminders>;
export type OrderDispute = InferModel<typeof orderDisputes>;
export type BuyerType = InferModel<typeof buyerTypes>;
export type BuyerProfile = InferModel<typeof buyerProfiles>;
export type DeliveryAgent = InferModel<typeof deliveryAgents>;
export type Delivery = InferModel<typeof deliveries>;
export type Auction = InferModel<typeof auctions>;
export type Bid = InferModel<typeof bids>;
export type Warehouse = InferModel<typeof warehouses>;
export type MarketOffer = InferModel<typeof marketOffers>;
export type MarketplaceRating = InferModel<typeof marketplaceRatings>;
export type Stock = InferModel<typeof stocks>;
export type SeedAllocation = InferModel<typeof seedAllocations>;
export type SeedDistribution = InferModel<typeof seedDistributions>;
export type SeedDistributionAttempt = InferModel<typeof seedDistributionAttempts>;
