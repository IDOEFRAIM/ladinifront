import {
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,varchar,real
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  marketplaceSchema,
  producerStatusEnum,
  orderStatusEnum,
  deliveryAgentStatusEnum,
  deliveryStatusEnum,
  unitEnum,
  stockTypeEnum,
  movementTypeEnum,
  expenseCategoryEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  orderSourceEnum,
  auctionStatusEnum,
  escrowStatusEnum,
} from './_config';
import { type InferModel } from 'drizzle-orm';
import { zones,organizations } from './governance'; // Importe la table zone (schéma governance)
//XCF9ZAOZsaF9rPCW  $env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx drizzle-kit migrate 
//DATABASE_URL="postgresql://postgres.zcnkjlvhegyykoeuckwv:XCF9ZAOZsaF9rPCW@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

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
//
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
  logoUrl:text('logo_url'),
  phoneNumber:text('phone_number'),
  rating:integer('rating'),
  reviewsCount:integer('reviews_count').default(0).notNull(),
  companyRegistrationNumber:text('company_registration_number'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('producers_status_idx').on(t.status),
  index('producers_org_idx').on(t.organizationId),
  index('producers_zone_idx').on(t.zoneId),
]);

export const clients = marketplaceSchema.table('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  location: text('location'),
  totalOrders: integer('total_orders').default(0).notNull(),
  totalSpent: doublePrecision('total_spent').default(0).notNull(),
  lastOrderDate: timestamp('last_order_date'),
  producerId: uuid('producer_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('clients_phone_idx').on(t.phone),
  index('clients_name_idx').on(t.name),
  index('clients_producer_idx').on(t.producerId),
]);

// ── Buyers (B2B segmentation) ─────────────────────────────────────────

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
  
  // Champs manquants ajoutés pour correspondre à SQLAlchemy
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

// ── Deliveries (Logistics) ────────────────────────────────────────────

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
]);


export const farms = marketplaceSchema.table('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  size: doublePrecision('size'),
  soilType: text('soil_type'),
  waterSource: text('water_source'),
  
  // CORRECTION 1 : Ajout de .references() pour l'intégrité
  // On pointe vers governance.zones.id
  zoneId: uuid('zone_id').references(() => zones.id), 
  
  // On pointe vers marketplace.producers.id
  producerId: uuid('producer_id')
    .notNull()
    .references(() => producers.id), 

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (t) => [
  index('farms_producer_idx').on(t.producerId),
  index('farms_zone_idx').on(t.zoneId),
]);

export const cropCycles = marketplaceSchema.table('crop_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull().references(() => farms.id),
  cropType: text('crop_type').notNull(),
  areaSize: doublePrecision('area_size').notNull(),
  plantedAt: timestamp('planted_at').notNull(),
  expectedHarvestDate: timestamp('expected_harvest_date').notNull(),
  targetYield: doublePrecision('target_yield'),
  expectedYield: doublePrecision('expected_yield'),
  status: text('status').notNull(),
  variety: text('variety'),
  farmingMethod: text('farming_method').default('conventional'),
  soilType: text('soil_type'),
  lastInterventionDate: timestamp('last_intervention_date'),

  subCategoryId: uuid('sub_category_id'),
  growthStage: text('growth_stage'),
  isPublic: boolean('is_public').default(false).notNull(),
  preorderEnabled: boolean('preorder_enabled').default(false).notNull(),
  estimatedAvailableAt: timestamp('estimated_available_at'),
  availableQuantity: doublePrecision('available_quantity').default(0).notNull(),
  reservedQuantity: doublePrecision('reserved_quantity').default(0).notNull(),
  pricePerUnit: doublePrecision('price_per_unit'),
  unit: unitEnum('unit').default('KG').notNull(),
  productionType: text('production_type').default('CROP').notNull(),
  species: text('species'),
  breed: text('breed'),
  initialStock: doublePrecision('initial_stock').default(0).notNull(),
  currentStock: doublePrecision('current_stock').default(0).notNull(),
  hatchDate: timestamp('hatch_date'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('crop_cycles_farm_idx').on(t.farmId),
  index('crop_cycles_status_idx').on(t.status),
  index('crop_cycles_subcategory_idx').on(t.subCategoryId),
  index('crop_cycles_public_idx').on(t.isPublic),
  index('crop_cycles_preorder_idx').on(t.preorderEnabled),
  index('crop_cycles_available_at_idx').on(t.estimatedAvailableAt),
]);

// ── AgTech: Carnet de champ ──────────────────────────────────────────────
export const fieldInterventions = marketplaceSchema.table('field_interventions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cropCycleId: uuid('crop_cycle_id').notNull().references(() => cropCycles.id),
  type: text('type').notNull(), // SEMIS, IRRIGATION, FERTILISATION, TRAITEMENT, RECOLTE, TRAVAIL_SOL
  description: text('description'),
  inputUsed: text('input_used'),
  quantity: doublePrecision('quantity'),
  unit: text('unit'),
  costPerUnit: doublePrecision('cost_per_unit').default(0),
  machineryUsed: text('machinery_used'),
  fuelConsumption: doublePrecision('fuel_consumption'),
  hoursWorked: doublePrecision('hours_worked'),
  observedBbchStage: integer('observed_bbch_stage'),
  performedAt: timestamp('performed_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('fi_crop_cycle_idx').on(t.cropCycleId),
  index('fi_performed_at_idx').on(t.performedAt),
  index('fi_type_idx').on(t.type),
]);

// ── AgTech: Dernières valeurs capteurs par ferme ────────────────────────
export const sensorDataSummary = marketplaceSchema.table('sensor_data_summary', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull().references(() => farms.id),
  soilMoisture: doublePrecision('soil_moisture'),
  lastRainfall: doublePrecision('last_rainfall'),
  accumulatedGdd: integer('accumulated_gdd'),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('sds_farm_unique').on(t.farmId),
]);

// ── AgTech: Référentiel cultures ────────────────────────────────────────
export const agronomicStandards = marketplaceSchema.table('agronomic_standards', {
  id: uuid('id').primaryKey().defaultRandom(),
  cropType: text('crop_type').notNull(),
  varietyType: text('variety_type'),
  nitrogenNeeds: doublePrecision('nitrogen_needs'),
  phosphorusNeeds: doublePrecision('phosphorus_needs'),
  potassiumNeeds: doublePrecision('potassium_needs'),
  baseTemperature: doublePrecision('base_temperature'),
  gddToHarvest: integer('gdd_to_harvest'),
  minHumidityThreshold: doublePrecision('min_humidity_threshold'),
  maxWindSpeedForTreatment: doublePrecision('max_wind_speed_treatment').default(19.0),
  version: text('version'),
}, (t) => [
  uniqueIndex('as_crop_variety_unique').on(t.cropType, t.varietyType),
  index('as_crop_type_idx').on(t.cropType),
]);

// ── AgTech: Catalogue maladies/ravageurs ────────────────────────────────
export const pestDiseaseCatalog = marketplaceSchema.table('pest_disease_catalog', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // MALADIE_FONGIQUE, INSECTE, VIRUS, BACTERIE
  targetCrops: text('target_crops').array().notNull(),
  symptomsDescription: text('symptoms_description'),
  criticalStageBbch: integer('critical_stage_bbch'),
  weatherTriggers: jsonb('weather_triggers'), // { min_temp, max_temp, min_humidity, duration_hours }
  treatmentThreshold: text('treatment_threshold'),
  recommendedMolecules: text('recommended_molecules').array(),
  bioSolutions: text('bio_solutions').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('pdc_type_idx').on(t.type),
  index('pdc_name_idx').on(t.name),
]);

// ── AgTech: Profils de sol (analyses labo) ──────────────────────────────
export const soilProfiles = marketplaceSchema.table('soil_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull().references(() => farms.id),
  clayPercentage: doublePrecision('clay_percentage'),
  sandPercentage: doublePrecision('sand_percentage'),
  siltPercentage: doublePrecision('silt_percentage'),
  organicMatter: doublePrecision('organic_matter'),
  phValue: doublePrecision('ph_value'),
  waterRetentionCapacity: doublePrecision('water_retention_capacity'),
  samplingDate: timestamp('sampling_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('sp_farm_idx').on(t.farmId),
  index('sp_sampling_date_idx').on(t.samplingDate),
]);

// ── AgTech: Historique télémétrie IoT ───────────────────────────────────
export const sensorTelemetryHistory = marketplaceSchema.table('sensor_telemetry_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull().references(() => farms.id),
  soilMoisture: doublePrecision('soil_moisture'),
  temperature: doublePrecision('temperature'),
  humidity: doublePrecision('humidity'),
  solarRadiation: doublePrecision('solar_radiation'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (t) => [
  index('telemetry_farm_time_idx').on(t.farmId, t.timestamp),
]);

// ── AgTech: Observations terrain BBCH ───────────────────────────────────
export const cropGrowthLogs = marketplaceSchema.table('crop_growth_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  cropCycleId: uuid('crop_cycle_id').notNull().references(() => cropCycles.id),
  stageCode: integer('stage_code').notNull(),
  observedAt: timestamp('observed_at').defaultNow(),
  imageSnapshotUrl: text('image_snapshot_url'),
  accumulatedGddAtStage: integer('accumulated_gdd_at_stage'),
}, (t) => [
  index('cgl_crop_cycle_idx').on(t.cropCycleId),
  index('cgl_observed_at_idx').on(t.observedAt),
]);

// ── AgTech: Référentiel stades BBCH par culture ────────────────────────
export const cropGrowthStages = marketplaceSchema.table('crop_growth_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  cropType: text('crop_type').notNull(),
  stageCode: integer('stage_code').notNull(),
  stageName: text('stage_name').notNull(),
  gddThreshold: integer('gdd_threshold').notNull(),
  nitrogenNeedKgHa: doublePrecision('nitrogen_need_kgha').default(0),
  waterNeedMmDay: doublePrecision('water_need_mmday').default(0),
  agronomicAdvice: text('agronomic_advice'),
  version: text('version').default('v1'),
}, (t) => [
  uniqueIndex('cgs_crop_stage_unique').on(t.cropType, t.stageCode),
  index('cgs_crop_type_idx').on(t.cropType),
]);

export const stocks = marketplaceSchema.table('stocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id'),
  warehouseId: uuid('warehouse_id'),
  organizationId: uuid('organization_id'),
  itemName: text('item_name').notNull(),
  quantity: doublePrecision('quantity').default(0).notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  type: stockTypeEnum('type').default('HARVEST').notNull(),
  verifiedAt: timestamp('verified_at'),
  verifiedById: uuid('verified_by_id'),
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
  quantity: doublePrecision('quantity').notNull(),
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
  quantity: doublePrecision('quantity').notNull(),
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
  amount: doublePrecision('amount').notNull(),
  category: expenseCategoryEnum('category').default('OTHER').notNull(),
  date: timestamp('date').defaultNow().notNull(),
}, (t) => [
  index('expenses_farm_idx').on(t.farmId),
  index('expenses_category_idx').on(t.category),
  index('expenses_date_idx').on(t.date),
]);

export const products = marketplaceSchema.table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  shortCode: text('short_code').unique(),
  name: text('name').default('Produit').notNull(),
  categoryLabel: text('category_label').notNull(),
  subCategoryId: uuid('sub_category_id'),
  localNames: jsonb('local_names'),
  description: text('description'),
  price: doublePrecision('price').notNull(),
  unit: unitEnum('unit').default('KG').notNull(),
  quantityForSale: doublePrecision('quantity_for_sale').default(0).notNull(),
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  audioUrl: text('audio_url'),
  
  // Nouveaux champs synchronisés
  qualityClass: text('quality_class'),
  minOrderQuality: text('min_order_quality'),
  packagingType: text('packaging_type'),
  harvestDate: timestamp('harvest_date'),
  isAvailable: boolean('is_available').default(true).notNull(),

  producerId: uuid('producer_id').notNull(),
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
]);



// ── 3. ORDERS ─────────────────────────────────────────────────────────────
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
  totalAmount: real('total_amount').notNull(),
  isAgentOrder: boolean('is_agent_order').default(false).notNull(),
  
  // Nouveaux champs financiers et enchères synchronisés avec Drizzle Web
  deliveryDate: timestamp('delivery_date'),
  subtotal: real('subtotal').default(0.0).notNull(),
  taxAmount: real('tax_amount').default(0.0).notNull(),
  currency: varchar('currency').default('XOF').notNull(),
  deliveryFee: real('delivery_fee').default(0.0).notNull(),
  cancellationRole: varchar('cancellation_role'),
  escrowWalletId: uuid('escrow_wallet_id'),
  
  auctionId: uuid('auction_id').references(() => auctions.id),
  winningBidId: uuid('winning_bid_id').references(() => bids.id),

  orderType: varchar('order_type').default('STANDARD').notNull(),
  cropCycleId: uuid('crop_cycle_id').references(() => cropCycles.id),
  expectedFulfillmentDate: timestamp('expected_fulfillment_date'),
  preorderConvertedAt: timestamp('preorder_converted_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => {
  return {
    ordersBuyerIdx: index('orders_buyer_idx').on(table.buyerId),
    ordersOrgIdx: index('orders_org_idx').on(table.organizationId),
    ordersStatusIdx: index('orders_status_idx').on(table.status),
    ordersDeliveryStatusIdx: index('orders_delivery_status_idx').on(table.deliveryStatus),
    ordersZoneIdx: index('orders_zone_idx').on(table.zoneId),
    ordersCreatedIdx: index('orders_created_idx').on(table.createdAt),
    ordersPhoneIdx: index('orders_phone_idx').on(table.customerPhone),
    ordersAuctionUnique: uniqueIndex('orders_auction_unique').on(table.auctionId),
    ordersWinningBidIdx: index('orders_winning_bid_idx').on(table.winningBidId),
    ordersTypeIdx: index('orders_type_idx').on(table.orderType),
    ordersCropCycleIdx: index('orders_crop_cycle_idx').on(table.cropCycleId),
  };
});


// ── 4. ORDER ITEMS ────────────────────────────────────────────────────────
export const orderItems = marketplaceSchema.table('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  
  quantity: real('quantity').notNull(),
  priceAtSale: real('price_at_sale').notNull(),
}, (table) => {
  return {
    orderItemsOrderIdx: index('order_items_order_idx').on(table.orderId),
    orderItemsProductIdx: index('order_items_product_idx').on(table.productId),
  };
});


// ── 5. ORDER DISPUTES ─────────────────────────────────────────────────────
export const orderDisputes = marketplaceSchema.table('order_disputes', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  escrowWalletId: uuid('escrow_wallet_id'),
  raisedById: uuid('raised_by_id').notNull(), 
  reasonCategory: varchar('reason_category').notNull(),
  description: text('description').notNull(),
  // Gestion du tableau natif PG avec valeur par défaut '{}'::text[] via SQL brut
  evidenceImages: text('evidence_images').array().notNull().default(sql`'{}'::text[]`),
  requestedSolution: varchar('requested_solution').notNull(),
  disputedAmount: real('disputed_amount').default(0.0).notNull(),
  escrowPayoutStatus: varchar('escrow_payout_status').default('HELD').notNull(),
  status: varchar('status').default('PENDING').notNull(),
  resolutionNotes: text('resolution_notes'),
  
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => {
  return {
    orderDisputesOrderIdx: index('order_disputes_order_idx').on(table.orderId),
    orderDisputesStatusIdx: index('order_disputes_status_idx').on(table.status),
    orderDisputesRaisedByIdx: index('order_disputes_raised_by_idx').on(table.raisedById),
    orderDisputesEscrowIdx: index('order_disputes_escrow_idx').on(table.escrowWalletId),
  };
});






export const auctions = marketplaceSchema.table('auctions', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').notNull(),
  subCategoryId: uuid('sub_category_id').notNull(),
  description: text('description'),
  quantity: doublePrecision('quantity').notNull(),
  unit: unitEnum('unit').default('TONNE').notNull(),
  maxPricePerUnit: doublePrecision('max_price_per_unit').notNull(),
  
  // Métriques Logistique & Qualité ajoutées
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
  offeredPrice: doublePrecision('offered_price').notNull(),
  linkedStockId: uuid('linked_stock_id'),
  isWinner: boolean('is_winner').default(false).notNull(),
  status: text('status').default('PENDING').notNull(), // PENDING, WINNER, LOST
  message: text('message'), // Note optionnelle du producteur
  notifiedAt: timestamp('notified_at'), // Quand le participant a été notifié du résultat
  estimatedDeliveryDate:timestamp('estimated_delivery_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('bids_auction_producer_unique').on(t.auctionId, t.producerId),
  index('bids_auction_idx').on(t.auctionId),
  index('bids_producer_idx').on(t.producerId),
  index('bids_linked_stock_idx').on(t.linkedStockId),
  index('bids_status_idx').on(t.status),
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
  cropCycles,
  fieldInterventions,
  sensorDataSummary,
  agronomicStandards,
  pestDiseaseCatalog,
  soilProfiles,
  sensorTelemetryHistory,
  cropGrowthLogs,
  cropGrowthStages,
  stocks,
  stockMovements,
  batches,
  expenses,
  products,
  orders,
  orderItems,
  auctions,
  bids,
};

// Types
export type Producer = InferModel<typeof producers>;
export type Product = InferModel<typeof products>;
export type Order = InferModel<typeof orders>;
export type BuyerType = InferModel<typeof buyerTypes>;
export type BuyerProfile = InferModel<typeof buyerProfiles>;
export type DeliveryAgent = InferModel<typeof deliveryAgents>;
export type Delivery = InferModel<typeof deliveries>;
export type Auction = InferModel<typeof auctions>;
export type Bid = InferModel<typeof bids>;
export type OrderItem = InferModel<typeof orderItems>;
export type Warehouse = InferModel<typeof warehouses>;
export type CropCycle = InferModel<typeof cropCycles>;
export type FieldIntervention = InferModel<typeof fieldInterventions>;
export type SoilProfile = InferModel<typeof soilProfiles>;
export type CropGrowthLog = InferModel<typeof cropGrowthLogs>;
export type CropGrowthStage = InferModel<typeof cropGrowthStages>;
export type AgronomicStandard = InferModel<typeof agronomicStandards>;
export type PestDisease = InferModel<typeof pestDiseaseCatalog>;
export type SensorTelemetry = InferModel<typeof sensorTelemetryHistory>;