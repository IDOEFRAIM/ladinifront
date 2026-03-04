import {
  pgSchema,
  pgEnum,
  text,
} from 'drizzle-orm/pg-core';

export const authSchema = pgSchema('auth');
export const governanceSchema = pgSchema('governance');
export const marketplaceSchema = pgSchema('marketplace');
export const intelligenceSchema = pgSchema('intelligence');

// Use simple text columns for enums to avoid creating Postgres enum types
export const roleEnum = (name: string) => text(name);

export const producerStatusEnum = (name: string) => text(name);

export const orderStatusEnum = (name: string) => text(name);

export const paymentStatusEnum = (name: string) => text(name);

export const unitEnum = (name: string) => text(name);

export const stockTypeEnum = (name: string) => text(name);

export const movementTypeEnum = (name: string) => text(name);

export const expenseCategoryEnum = (name: string) => text(name);

export const paymentMethodEnum = (name: string) => text(name);

export const orderSourceEnum = (name: string) => text(name);

export const organizationTypeEnum = (name: string) => text(name);

export const orgRoleEnum = (name: string) => text(name);

export const orgStatusEnum = (name: string) => text(name);

export const agentActionStatusEnum = (name: string) => text(name);

export const validationPriorityEnum = (name: string) => text(name);

export const auctionStatusEnum = (name: string) => text(name);

// Exported schemas and enums for per-schema modules to import.
export type Schemas = {
  authSchema: typeof authSchema;
  governanceSchema: typeof governanceSchema;
  marketplaceSchema: typeof marketplaceSchema;
  intelligenceSchema: typeof intelligenceSchema;
};
