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
  real,
  check,
  AnyPgColumn, } from 'drizzle-orm/pg-core';
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
import { subCategories } from './governance';

// ── WAREHOUSES ─────────────────────────────────────────────────────────────
export const warehouses = marketplaceSchema.table('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  capacity: doublePrecision('capacity'),
  location: text('location'),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('warehouses_zone_idx').on(t.zoneId),
]);

// ── PRODUCERS ──────────────────────────────────────────────────────────────
export const producers = marketplaceSchema.table('producers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).unique().notNull(),
  organizationId: uuid('organization_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
  businessName: text('business_name'),
  status: producerStatusEnum('status').default('PENDING').notNull(),
  isCertified: boolean('is_certified').default(false).notNull(),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
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
  producerId: uuid('producer_id').references((): AnyPgColumn => producers.id, { onDelete: 'set null' }),
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
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).unique().notNull(),
  buyerTypeId: uuid('buyer_type_id').references((): AnyPgColumn => buyerTypes.id, { onDelete: 'set null' }),
  establishmentName: text('establishment_name'),
  defaultDeliveryAddress: text('default_delivery_address'),
  isVerified: boolean('is_verified').default(false).notNull(),
  trustBadge: text('trust_badge'),
  rating: doublePrecision('rating'),
  reviewsCount: integer('reviews_count').default(0).notNull(),
  companyRegistrationNumber: text('company_registration_number'),
  verifiedAt: timestamp('verified_at'),
  verifiedById: uuid('verified_by_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
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
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).unique().notNull(),
  vehicleType: text('vehicle_type'),
  licenseNumber: text('license_number'),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
  status: deliveryAgentStatusEnum('status').default('OFFLINE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('delivery_agents_zone_idx').on(t.zoneId),
  index('delivery_agents_status_idx').on(t.status),
]);

export const deliveries = marketplaceSchema.table('deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references((): AnyPgColumn => orders.id, { onDelete: 'restrict' }).notNull(),
  deliveryAgentId: uuid('delivery_agent_id').references((): AnyPgColumn => deliveryAgents.id, { onDelete: 'set null' }),
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
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'restrict' }),

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
  index('ix_market_offers_label_trgm').using('gin', t.productLabel.op('gin_trgm_ops')),
]);

// ── STOCKS (inventaire atomique) ───────────────────────────────────────────
export const stocks = marketplaceSchema.table('stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').references((): AnyPgColumn => farms.id, { onDelete: 'restrict' }),
  warehouseId: uuid('warehouse_id').references((): AnyPgColumn => warehouses.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references((): AnyPgColumn => organizations.id, { onDelete: 'set null' }),
  verifiedById: uuid('verified_by_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
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
  stockId: uuid('stock_id').references((): AnyPgColumn => stocks.id, { onDelete: 'restrict' }).notNull(),
  type: movementTypeEnum('type').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('stock_movements_stock_idx').on(t.stockId),
  index('stock_movements_created_idx').on(t.createdAt),
]);

export const expenses = marketplaceSchema.table('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').references((): AnyPgColumn => farms.id, { onDelete: 'restrict' }).notNull(),
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
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'restrict' }),
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
  verifiedById: uuid('verified_by_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
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
  // Recherche floue (pg_trgm) du catalogue — search_products / get_public_products.
  index('ix_products_name_trgm').using('gin', t.name.op('gin_trgm_ops')),
]);

// ── ORDERS (Commande→Paiement→Livraison→Confirmation) ──────────────────────
export const orders = marketplaceSchema.table('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  buyerId: uuid('buyer_id').references(() => buyerProfiles.id),
  clientId: uuid('client_id').references(() => clients.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  zoneId: uuid('zone_id').references(() => zones.id),

  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  paymentMethod: text('payment_method').default('CASH').notNull(),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  city: text('city'),
  gpsLat: real('gps_lat'),
  gpsLng: real('gps_lng'),
  deliveryDesc: text('delivery_desc'),
  audioUrl: text('audio_url'),
  status: text('status').default('PENDING').notNull(),
  deliveryStatus: text('delivery_status').default('PENDING').notNull(),
  source: text('source').default('APP').notNull(),
  whatsappId: text('whatsapp_id'),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  isAgentOrder: boolean('is_agent_order').default(false).notNull(),

  deliveryDate: timestamp('delivery_date'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).default('0').notNull(),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  currency: text('currency').default('XOF').notNull(),
  deliveryFee: numeric('delivery_fee', { precision: 14, scale: 2 }).default('0').notNull(),
  cancellationRole: text('cancellation_role'),
  escrowWalletId: uuid('escrow_wallet_id'),

  // --- Escrow Paydunya --- `paymentStatus` (ci-dessus) porte aussi ESCROWED
  // (payé, fonds bloqués) / PAID_OUT (livraison confirmée par OTP, fonds
  // débloqués) / REFUNDED. Colonnes ajoutées côté ORM Python
  // (agriconnect.domain.orders.models.Order) via un ALTER TABLE manuel
  // hors-migration, jamais propagées ici — absentes de tout schéma
  // migré depuis Drizzle jusqu'au 2026-09-02 (migration Heroku).
  paydunyaInvoiceToken: text('paydunya_invoice_token'),
  deliveryOtp: text('delivery_otp'),
  paymentExpiresAt: timestamp('payment_expires_at'),
  lockedAmount: numeric('locked_amount', { precision: 14, scale: 2 }),
  // Anti-force-brute du code de livraison + corrélation de checkout : colonnes
  // ajoutées côté Python (SCHEMA_COLUMN_DDL) et déjà présentes en base ; miroir ici
  // pour que Drizzle ne les ignore pas / ne tente pas de les supprimer.
  deliveryOtpAttempts: integer('delivery_otp_attempts').default(0).notNull(),
  deliveryOtpLockedUntil: timestamp('delivery_otp_locked_until'),
  checkoutGroupId: uuid('checkout_group_id'),

  auctionId: uuid('auction_id').references(() => auctions.id),
  winningBidId: uuid('winning_bid_id').references(() => bids.id),

  orderType: text('order_type').default('STANDARD').notNull(),
  marketOfferId: uuid('market_offer_id').references(() => marketOffers.id), // ex crop_cycle_id (prévente)
  expectedFulfillmentDate: timestamp('expected_fulfillment_date'),
  preorderConvertedAt: timestamp('preorder_converted_at'),

  // Ajout : timestamp de confirmation de réception (clôture du cycle)
  confirmedAt: timestamp('confirmed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('orders_buyer_idx').on(t.buyerId),
  index('orders_client_idx').on(t.clientId),
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
  // Escrow : un jeton Paydunya identifie AU PLUS une commande (IPN idempotent) ; index partiel car nullable.
  uniqueIndex('ix_orders_paydunya_token').on(t.paydunyaInvoiceToken).where(sql`${t.paydunyaInvoiceToken} IS NOT NULL`),
  // Cron d'expiration des paiements en attente.
  index('ix_orders_payment_expires_at').on(t.paymentExpiresAt).where(sql`${t.paymentStatus} = 'PENDING'`),
  // Retrouver les commandes issues d'un même checkout multi-producteurs.
  index('ix_orders_checkout_group').on(t.checkoutGroupId).where(sql`${t.checkoutGroupId} IS NOT NULL`),
]);

export const orderItems = marketplaceSchema.table('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  priceAtSale: numeric('price_at_sale', { precision: 12, scale: 2 }).notNull(),
  // (2026-08-30) Support des paliers de prix/conditionnement multiples
  // (Product.pricingTiers). NULL sur toute commande sans palier. `tierId`
  // trace le palier acheté ; `baseUnitQuantity` est la quantité déjà
  // convertie dans l'unité de BASE du produit (ex: 3 bidons de 10L => 30 en
  // LITRE) — c'est CETTE valeur qui débite `products.quantityForSale`,
  // jamais `quantity` telle quelle dès qu'un palier est impliqué (voir
  // agriconnect.domain.pricing_tiers::resolve_stock_debit côté agent).
  tierId: text('tier_id'),
  baseUnitQuantity: numeric('base_unit_quantity', { precision: 14, scale: 3 }),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
  index('order_items_product_idx').on(t.productId),
]);

// ── PAYMENTS (journal de paiement — ajout) ─────────────────────────────────
export const payments = marketplaceSchema.table('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  currency: text('currency').default('XOF').notNull(),
  method: text('method').default('CASH').notNull(),        // CASH, MOBILE_MONEY, CARD, ESCROW
  status: text('status').default('PENDING').notNull(),     // PENDING→AUTHORIZED→CAPTURED→FAILED→REFUNDED
  provider: text('provider'),                               // ORANGE_MONEY, WAVE, STRIPE…
  providerRef: text('provider_ref'),                        // idempotence / réconciliation
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
  statusType: text('status_type').notNull(),  // ORDER | PAYMENT | DELIVERY
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorId: uuid('actor_id') /* id polymorphe : utilisateur OU producteur (voir producer.py) — volontairement SANS FK */,
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
  type: text('type').notNull(),          // PAYMENT_DUE | CONFIRM_RECEIPT | LEAVE_REVIEW | PREORDER_READY
  channel: text('channel').default('WHATSAPP').notNull(),
  status: text('status').default('SCHEDULED').notNull(), // SCHEDULED→SENT→CANCELLED→FAILED
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
  raisedById: uuid('raised_by_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).notNull(),
  reasonCategory: text('reason_category').notNull(),
  description: text('description').notNull(),
  evidenceImages: text('evidence_images').array().notNull().default(sql`'{}'::text[]`),
  requestedSolution: text('requested_solution').notNull(),
  disputedAmount: numeric('disputed_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  escrowPayoutStatus: text('escrow_payout_status').default('HELD').notNull(),
  status: text('status').default('PENDING').notNull(),
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
  buyerId: uuid('buyer_id').references((): AnyPgColumn => buyerProfiles.id, { onDelete: 'restrict' }).notNull(),
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'restrict' }).notNull(),
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
  winnerBidId: uuid('winner_bid_id').references((): AnyPgColumn => bids.id, { onDelete: 'restrict' }),
  escrowWalletId: uuid('escrow_wallet_id'),
  awardedAt: timestamp('awarded_at'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  targetZoneId: uuid('target_zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
  version: integer('version').default(0).notNull(),
  // Photos de référence jointes par l'acheteur à l'enchère — voir
  // agriconnect.services.database.auction::add_auction_photo. Ajoutée côté
  // ORM Python via ALTER TABLE manuel, jamais propagée ici.
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('auctions_status_idx').on(t.status),
  index('auctions_subcategory_idx').on(t.subCategoryId),
  index('auctions_buyer_idx').on(t.buyerId),
  index('auctions_escrow_status_idx').on(t.escrowStatus),
  index('auctions_zone_idx').on(t.targetZoneId),
  index('auctions_deadline_idx').on(t.deadline),
]);

export const bids = marketplaceSchema.table('bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id').references((): AnyPgColumn => auctions.id, { onDelete: 'restrict' }).notNull(),
  producerId: uuid('producer_id').references((): AnyPgColumn => producers.id, { onDelete: 'restrict' }).notNull(),
  offeredPrice: numeric('offered_price', { precision: 12, scale: 2 }).notNull(),
  linkedStockId: uuid('linked_stock_id').references((): AnyPgColumn => stocks.id, { onDelete: 'set null' }),
  isWinner: boolean('is_winner').default(false).notNull(),
  status: text('status').default('PENDING').notNull(),
  message: text('message'),
  notifiedAt: timestamp('notified_at'),
  validUntil: timestamp('valid_until'),
  estimatedDeliveryDate: timestamp('estimated_delivery_date'),
  // Photos du lot proposé par le producteur — voir
  // agriconnect.services.database.auction::add_bid_photo. Ajoutée côté ORM
  // Python via ALTER TABLE manuel, jamais propagée ici.
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('bids_auction_producer_unique').on(t.auctionId, t.producerId),
  index('bids_auction_idx').on(t.auctionId),
  index('bids_producer_idx').on(t.producerId),
  index('bids_linked_stock_idx').on(t.linkedStockId),
  index('bids_status_idx').on(t.status),
  // Invariant d'acceptation : AU PLUS un gagnant par enchère (garanti par PostgreSQL, pas seulement par le code).
  uniqueIndex('bids_one_winner_per_auction_uq').on(t.auctionId).where(sql`${t.isWinner} = true`),
]);

// ── APPROVISIONNEMENT RÉCURRENT (Phase 1 — fondation de données uniquement) ─
// À ne PAS confondre avec `PROCUREMENT_CREATE_REQUEST` / `auctions` (appel d'offres ponctuel, un seul gagnant) :
// un besoin récurrent est une règle permanente d'un acheteur ("40 kg de tomate chaque jour"), qui se matérialise
// en occurrences datées, elles-mêmes couvertes par une ou plusieurs allocations fournisseur.
// `recurring_need_overrides` et `need_proposals` ont été délibérément écartés du modèle validé : une occurrence
// porte directement son exception éventuelle et son état de matching (une seule ligne par besoin+date).
export const recurringNeeds = marketplaceSchema.table('recurring_needs', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').references((): AnyPgColumn => buyerProfiles.id, { onDelete: 'restrict' }).notNull(),
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'restrict' }).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  // DAILY | WEEKLY_DAYS | WEEKLY | ONE_OFF — volontairement fermé (pas de RRULE/cron générique, voir mandat pilote).
  recurrenceType: text('recurrence_type').notNull(),
  // Jours ISO (1=lundi..7=dimanche) — utilisé seulement si recurrenceType = WEEKLY_DAYS.
  weeklyDays: integer('weekly_days').array(),
  // Jours ISO exclus en permanence (ex: "tous les jours sauf le dimanche" sur un besoin DAILY) — un paramètre de
  // récurrence, PAS une exception ponctuelle (qui, elle, vit sur l'occurrence).
  excludedWeekdays: integer('excluded_weekdays').array(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at'),
  status: text('status').default('ACTIVE').notNull(),
  pausedUntil: timestamp('paused_until'),
  maxPricePerUnit: numeric('max_price_per_unit', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('recurring_needs_buyer_idx').on(t.buyerId),
  index('recurring_needs_subcategory_status_idx').on(t.subCategoryId, t.status),
  check('recurring_needs_quantity_chk', sql`${t.quantity} > 0`),
  check('recurring_needs_max_price_chk', sql`${t.maxPricePerUnit} IS NULL OR ${t.maxPricePerUnit} >= 0`),
  check('recurring_needs_recurrence_type_chk', sql`${t.recurrenceType} IN ('DAILY','WEEKLY_DAYS','WEEKLY','ONE_OFF')`),
  check('recurring_needs_status_chk', sql`${t.status} IN ('ACTIVE','PAUSED','CANCELLED')`),
  // WEEKLY_DAYS sans jours listés n'a pas de sens (aucune occurrence ne pourrait jamais être générée).
  check('recurring_needs_weekly_days_chk', sql`${t.recurrenceType} <> 'WEEKLY_DAYS' OR ${t.weeklyDays} IS NOT NULL`),
]);

// Demande concrète d'UN jour pour un besoin récurrent. Snapshot de quantité/unité au moment de la génération :
// une modification ultérieure de `recurring_needs` ne réécrit JAMAIS une occurrence déjà créée (propriété testée).
// Porte directement l'exception ponctuelle ("demain seulement 10 kg" = requestedQuantity modifiée sur CETTE ligne ;
// "suspends demain" = status SKIPPED) : pas de table d'override séparée.
export const recurringNeedOccurrences = marketplaceSchema.table('recurring_need_occurrences', {
  id: uuid('id').primaryKey().defaultRandom(),
  recurringNeedId: uuid('recurring_need_id').references((): AnyPgColumn => recurringNeeds.id, { onDelete: 'cascade' }).notNull(),
  // `timestamp`, pas `date` : aucune table du schéma marketplace n'utilise le type SQL DATE (harvestDate,
  // deliveryDeadline, etc. sont tous des timestamps) — on n'introduit pas un type inédit pour cette seule colonne.
  occurrenceDate: timestamp('occurrence_date').notNull(),
  requestedQuantity: numeric('requested_quantity', { precision: 14, scale: 3 }).notNull(),
  unit: unitEnum('unit').notNull(),
  status: text('status').default('OPEN').notNull(),
  // 0 NOT NULL plutôt que nullable : NULL n'apporterait aucune sémantique de plus que 0 ("rien matché/confirmé/
  // livré pour l'instant") et éviterait un 3ᵉ état (NULL / 0 / valeur) sans utilité pour ces compteurs cumulatifs.
  quantityMatched: numeric('quantity_matched', { precision: 14, scale: 3 }).default('0').notNull(),
  quantityConfirmed: numeric('quantity_confirmed', { precision: 14, scale: 3 }).default('0').notNull(),
  quantityDelivered: numeric('quantity_delivered', { precision: 14, scale: 3 }).default('0').notNull(),
  // CAS : une confirmation qui cible la version N est refusée si l'occurrence est déjà en version N+1 (même
  // principe que `ProcurementDraft.version` côté backend).
  version: integer('version').default(1).notNull(),
  notifiedAt: timestamp('notified_at'),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at'),
  // Corrélation vers la/les commandes issues de cette occurrence — même convention que `orders.checkoutGroupId`
  // (uuid libre, volontairement SANS FK : le groupe n'est pas une entité, juste une clé de regroupement).
  orderGroupId: uuid('order_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('recurring_need_occurrences_need_date_uq').on(t.recurringNeedId, t.occurrenceDate),
  index('recurring_need_occurrences_status_date_idx').on(t.status, t.occurrenceDate),
  check('recurring_need_occurrences_requested_qty_chk', sql`${t.requestedQuantity} > 0`),
  check('recurring_need_occurrences_matched_qty_chk', sql`${t.quantityMatched} >= 0`),
  check('recurring_need_occurrences_confirmed_qty_chk', sql`${t.quantityConfirmed} >= 0`),
  check('recurring_need_occurrences_delivered_qty_chk', sql`${t.quantityDelivered} >= 0`),
  check('recurring_need_occurrences_version_chk', sql`${t.version} >= 1`),
  check(
    'recurring_need_occurrences_status_chk',
    sql`${t.status} IN ('OPEN','SKIPPED','MATCHED','PROPOSED','ACCEPTED','PARTIALLY_ACCEPTED','REJECTED','EXPIRED','FULFILLED','PARTIALLY_FULFILLED','UNFULFILLED','CANCELLED')`
  ),
]);

// Partie d'une occurrence couverte par UN fournisseur — ligne PostgreSQL réelle (FK + CHECK), jamais un blob JSON,
// car elle participe ensuite à la consommation de stock, aux commandes, et potentiellement aux paiements.
// Phase 1 : la source de stock est exclusivement `products.quantityForSale` (catalogue vivant) — `market_offer_id`
// (prévente de récolte future) est volontairement absent, ajoutable plus tard par migration additive.
export const needAllocations = marketplaceSchema.table('need_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  occurrenceId: uuid('occurrence_id').references((): AnyPgColumn => recurringNeedOccurrences.id, { onDelete: 'cascade' }).notNull(),
  producerId: uuid('producer_id').references((): AnyPgColumn => producers.id, { onDelete: 'restrict' }).notNull(),
  productId: uuid('product_id').references((): AnyPgColumn => products.id, { onDelete: 'restrict' }).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  unit: unitEnum('unit').notNull(),
  status: text('status').default('PROPOSED').notNull(),
  // NULL jusqu'à la conversion en commande (Phase 5, hors scope ici) ; SET NULL si la ligne de commande
  // disparaissait un jour — ne bloque jamais la suppression d'un OrderItem pour une simple ligne de traçabilité.
  orderItemId: uuid('order_item_id').references((): AnyPgColumn => orderItems.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('need_allocations_occurrence_producer_product_uq').on(t.occurrenceId, t.producerId, t.productId),
  index('need_allocations_occurrence_idx').on(t.occurrenceId),
  index('need_allocations_producer_idx').on(t.producerId),
  index('need_allocations_product_idx').on(t.productId),
  index('need_allocations_order_item_idx').on(t.orderItemId),
  check('need_allocations_quantity_chk', sql`${t.quantity} > 0`),
  check('need_allocations_unit_price_chk', sql`${t.unitPrice} >= 0`),
  check('need_allocations_status_chk', sql`${t.status} IN ('PROPOSED','ACCEPTED','REJECTED','EXPIRED','CONVERTED')`),
]);

// ── MARKETPLACE RATINGS (réputation post-transaction — manquait côté Drizzle)
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
  actorId: uuid('actor_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).notNull(),
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
  recurringNeeds,
  recurringNeedOccurrences,
  needAllocations,
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
export type Stock = InferModel<typeof stocks>;
export type SeedAllocation = InferModel<typeof seedAllocations>;
export type SeedDistribution = InferModel<typeof seedDistributions>;
export type SeedDistributionAttempt = InferModel<typeof seedDistributionAttempts>;
export type RecurringNeed = InferModel<typeof recurringNeeds>;
export type RecurringNeedOccurrence = InferModel<typeof recurringNeedOccurrences>;
export type NeedAllocation = InferModel<typeof needAllocations>;
