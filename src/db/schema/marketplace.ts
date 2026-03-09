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
import { sql } from 'drizzle-orm';
import {
  marketplaceSchema,
  producerStatusEnum,
  orderStatusEnum,
  unitEnum,
  stockTypeEnum,
  movementTypeEnum,
  expenseCategoryEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  orderSourceEnum,
  auctionStatusEnum,
} from './_config';
import { type InferModel } from 'drizzle-orm';

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

export const farms = marketplaceSchema.table('farms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  location: text('location'),
  size: doublePrecision('size'),
  soilType: text('soil_type'),
  waterSource: text('water_source'),
  zoneId: uuid('zone_id'),
  producerId: uuid('producer_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('farms_producer_idx').on(t.producerId),
  index('farms_zone_idx').on(t.zoneId),
]);

export const cropCycles = marketplaceSchema.table('crop_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull(),
  cropType: text('crop_type').notNull(),
  areaSize: doublePrecision('area_size').notNull(),
  plantedAt: timestamp('planted_at').notNull(),
  expectedHarvestDate: timestamp('expected_harvest_date').notNull(),
  expectedYield: doublePrecision('expected_yield').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('crop_cycles_farm_idx').on(t.farmId),
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

export const orders = marketplaceSchema.table('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id'),
  organizationId: uuid('organization_id'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  zoneId: uuid('zone_id'),
  paymentMethod: paymentMethodEnum('payment_method').default('CASH').notNull(),
  paymentStatus: paymentStatusEnum('payment_status').default('PENDING').notNull(),
  city: text('city'),
  gpsLat: doublePrecision('gps_lat'),
  gpsLng: doublePrecision('gps_lng'),
  deliveryDesc: text('delivery_desc'),
  audioUrl: text('audio_url'),
  status: orderStatusEnum('status').default('PENDING').notNull(),
  source: orderSourceEnum('source').default('APP').notNull(),
  whatsappId: text('whatsapp_id'),
  totalAmount: doublePrecision('total_amount').notNull(),
  isAgentOrder: boolean('is_agent_order').default(false).notNull(),
  clientId: uuid('client_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('orders_buyer_idx').on(t.buyerId),
  index('orders_org_idx').on(t.organizationId),
  index('orders_status_idx').on(t.status),
  index('orders_zone_idx').on(t.zoneId),
  index('orders_created_idx').on(t.createdAt),
  index('orders_phone_idx').on(t.customerPhone),
]);

export const orderItems = marketplaceSchema.table('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull(),
  productId: uuid('product_id').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  priceAtSale: doublePrecision('price_at_sale').notNull(),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
  index('order_items_product_idx').on(t.productId),
]);

export const auctions = marketplaceSchema.table('auctions', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerId: uuid('buyer_id').notNull(),
  subCategoryId: uuid('sub_category_id').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: unitEnum('unit').default('TONNE').notNull(),
  maxPricePerUnit: doublePrecision('max_price_per_unit').notNull(),
  deadline: timestamp('deadline').notNull(),
  status: auctionStatusEnum('status').default('OPEN').notNull(),
  targetZoneId: uuid('target_zone_id'),
  version: integer('version').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('auctions_status_idx').on(t.status),
  index('auctions_zone_idx').on(t.targetZoneId),
  index('auctions_deadline_idx').on(t.deadline),
]);

export const bids = marketplaceSchema.table('bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id').notNull(),
  producerId: uuid('producer_id').notNull(),
  offeredPrice: doublePrecision('offered_price').notNull(),
  isWinner: boolean('is_winner').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('bids_auction_producer_unique').on(t.auctionId, t.producerId),
  index('bids_auction_idx').on(t.auctionId),
  index('bids_producer_idx').on(t.producerId),
]);

export default {
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
};

// Types
export type Producer = InferModel<typeof producers>;
export type Product = InferModel<typeof products>;
export type Order = InferModel<typeof orders>;
export type OrderItem = InferModel<typeof orderItems>;
export type Warehouse = InferModel<typeof warehouses>;
// marketplace schema proxy