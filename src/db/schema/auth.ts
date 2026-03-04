import { uuid, text, timestamp, index, uniqueIndex, integer } from 'drizzle-orm/pg-core';
import { type InferModel } from 'drizzle-orm';
import { authSchema, roleEnum } from './_config';

export const users = authSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
  phone: text('phone').unique(),
  role: roleEnum('role').default('USER').notNull(),
  zoneId: uuid('zone_id'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('users_role_idx').on(t.role),
  index('users_zone_idx').on(t.zoneId),
  index('users_created_idx').on(t.createdAt),
]);

export const accounts = authSchema.table('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, (t) => [
  uniqueIndex('accounts_provider_unique').on(t.provider, t.providerAccountId),
  index('accounts_user_idx').on(t.userId),
]);

export const sessions = authSchema.table('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').unique().notNull(),
  userId: uuid('user_id').notNull(),
  expires: timestamp('expires').notNull(),
}, (t) => [
  index('sessions_user_idx').on(t.userId),
]);

export default {
  users,
  accounts,
  sessions,
};

// Relations are defined centrally in ./relations.ts

// Type helpers
export type User = InferModel<typeof users>;
export type Account = InferModel<typeof accounts>;
export type Session = InferModel<typeof sessions>;
