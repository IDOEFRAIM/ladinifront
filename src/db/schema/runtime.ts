import { pgTable, text, integer, jsonb, timestamp, doublePrecision, index, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { marketplaceSchema } from './_config';

/**
 * Tables d'état runtime du backend Python (agent conversationnel).
 *
 * Jusqu'ici créées par du DDL Python exécuté au démarrage du worker
 * (`CREATE TABLE IF NOT EXISTS ...`), donc INVISIBLES pour Drizzle et pour toute
 * revue de migration. Elles sont désormais déclarées ici : Drizzle est l'unique
 * source du schéma, le backend Python ne crée plus rien.
 *
 * Accès Python : SQL brut (asyncpg via SQLAlchemy `text()`), miroir Core dans
 * `ladini/domain/runtime_tables.py`.
 */

const draftColumns = {
  draftId: text('draft_id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  // Version optimiste (compare-and-swap) : UPDATE ... WHERE version = :expected.
  version: integer('version').notNull(),
  status: text('status').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

// Brouillon de précommande acheteur (BUYER_PREORDER_INIT/CONFIRM).
export const preorderDrafts = marketplaceSchema.table('preorder_drafts', {
  ...draftColumns,
  // Renseigné à la création de la commande : l'IPN Paydunya et le cron d'expiration
  // retrouvent le brouillon par `Order.id`, jamais par `draft_id`.
  orderId: text('order_id'),
}, (t) => [
  index('ix_preorder_drafts_conversation').on(t.conversationId),
  index('ix_preorder_drafts_order_id').on(t.orderId).where(sql`${t.orderId} IS NOT NULL`),
]);

// Brouillon d'appel d'offres acheteur (procurement).
export const procurementDrafts = marketplaceSchema.table('procurement_drafts', {
  ...draftColumns,
}, (t) => [
  index('ix_procurement_drafts_conversation').on(t.conversationId),
]);

// Brouillon de publication de vente producteur.
export const salesPublishDrafts = marketplaceSchema.table('sales_publish_drafts', {
  ...draftColumns,
}, (t) => [
  index('ix_sales_publish_drafts_conversation').on(t.conversationId),
]);

// Idempotence serveur des appels d'outils MCP : une ligne par (clé, outil).
// La clé primaire composite est la garantie d'unicité (pas Redis).
export const mcpIdempotencyRecords = marketplaceSchema.table('mcp_idempotency_records', {
  idempotencyKey: text('idempotency_key').notNull(),
  toolName: text('tool_name').notNull(),
  requestHash: text('request_hash').notNull(),
  status: text('status').notNull(), // PENDING | COMPLETED | FAILED
  externalResult: jsonb('external_result'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // PRIMARY KEY (idempotency_key, tool_name)
  primaryKey({ columns: [t.idempotencyKey, t.toolName] }),
]);

// Espace de travail conversationnel (état LangGraph persisté).
export const agriWorkspaces = pgTable('agri_workspaces', {
  workspaceId: text('workspace_id').primaryKey(),
  workspaceType: text('workspace_type').notNull().default('producer'),
  activeAgent: text('active_agent').notNull().default('market'),
  activeGoal: text('active_goal').notNull().default(''),
  activeForm: text('active_form'),
  lockedAgent: text('locked_agent'),
  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
  langgraphState: jsonb('langgraph_state').notNull().default(sql`'{}'::jsonb`),
  // Epoch en secondes (float) — écrit par le backend Python (time.time()).
  updatedAt: doublePrecision('updated_at').notNull().default(0),
});
