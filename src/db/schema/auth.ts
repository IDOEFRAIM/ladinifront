import { uuid, text, timestamp, index, uniqueIndex, integer, boolean, doublePrecision } from 'drizzle-orm/pg-core';
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
  whatsappEnabled: boolean('whatsapp_enabled').default(true), // Canaux de communication
  latitude: doublePrecision('latitude'), // Géoloc livraison
  longitude: doublePrecision('longitude'), // Géoloc livraison
  // Horodatage de la dernière mise à jour GPS (nullable — l'absence de
  // position ne doit jamais bloquer un profil). Alimenté par l'ingestion
  // native Twilio (message de localisation WhatsApp) côté agent — voir
  // agriconnect.domain.identity.models.User.location_updated_at (backend
  // Python, même table `auth.users`). Colonne manquante ici jusqu'au
  // 2026-09-02 (migration Heroku) : présente côté ORM Python depuis la
  // feature GPS delivery mais jamais propagée à ce schéma Drizzle
  // source-de-vérité — `search_products` échouait avec `UndefinedColumnError:
  // column users.location_updated_at does not exist` dès que le backend
  // tournait contre une base migrée depuis CE schéma (confirmé sur Heroku,
  // vraisemblablement masqué sur DigitalOcean par un ALTER TABLE manuel
  // hors-migration).
  locationUpdatedAt: timestamp('location_updated_at'),
  cnibNumber: text('cnib_number').unique(),
  role: roleEnum('role').default('USER').notNull(),
  identityVerified: boolean('identity_verified').default(false),
  zoneId: uuid('zone_id'),
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  // Modération / abus : blocage (annulations répétées) & bannissement (produits interdits).
  accountStatus: text('account_status').default('ACTIVE').notNull(), // ACTIVE | BLOCKED | BANNED
  blockedReason: text('blocked_reason'),
  blockedAt: timestamp('blocked_at'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('users_role_idx').on(t.role),
  index('users_zone_idx').on(t.zoneId),
  index('users_created_idx').on(t.createdAt),
  index('users_account_status_idx').on(t.accountStatus),
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