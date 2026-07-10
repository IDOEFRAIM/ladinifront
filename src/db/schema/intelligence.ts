/**
 * INTELLIGENCE SCHEMA — Marketplace edition
 * ══════════════════════════════════════════════════════════════════════════
 * Réduit à l'infrastructure OPÉRATIONNELLE de l'agent transactionnel :
 *   - audit transactionnel
 *   - validation humaine des actions de l'agent (checkout, litiges)
 *   - persistance conversationnelle (panier / commande en cours)
 *   - mémoire courte de l'agent (slots inter-tours)
 *   - réputation (trust) — cœur de confiance de la marketplace
 *
 * Tout l'héritage « conseil » (crop_profiles, fertilizer_steps, soil_analyses,
 * ai_recommendations, weather_data_logs, agent_telemetry, external_context_files,
 * territory_events, anomalies) a été SUPPRIMÉ.
 */
import {
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  doublePrecision,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { intelligenceSchema, agentActionStatusEnum, validationPriorityEnum } from './_config';
import { type InferModel } from 'drizzle-orm';

// ── Audit transactionnel ─────────────────────────────────────────────────
export const auditLogs = intelligenceSchema.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').notNull(),
  action: text('action').notNull(),
  entityId: text('entity_id').notNull(),
  entityType: text('entity_type').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('audit_logs_actor_idx').on(t.actorId),
  index('audit_logs_entity_idx').on(t.entityId),
  // Optimisation : recherche fréquente "dernières actions sur une entité"
  index('audit_logs_entity_time_idx').on(t.entityType, t.createdAt),
]);

// ── Validation humaine des actions de l'agent (checkout, litige, remboursement) ─
export const agentActions = intelligenceSchema.table('agent_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentName: text('agent_name').notNull(),
  actionType: text('action_type').notNull(),
  batchId: text('batch_id'),
  payload: jsonb('payload'),
  status: agentActionStatusEnum('status').default('PENDING').notNull(),
  priority: validationPriorityEnum('priority').default('MEDIUM').notNull(),
  orderId: uuid('order_id'),
  userId: uuid('user_id'),
  auditTrailId: text('audit_trail_id'),
  aiReasoning: text('ai_reasoning'),
  adminNotes: text('admin_notes'),
  validatedById: text('validated_by_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('agent_actions_status_idx').on(t.status),
  index('agent_actions_batch_idx').on(t.batchId),
  index('agent_actions_name_idx').on(t.agentName),
  uniqueIndex('agent_actions_order_unique').on(t.orderId),
  // Optimisation : la file d'attente de validation = pending triés par priorité
  index('agent_actions_queue_idx').on(t.status, t.priority),
]);

// ── Persistance conversationnelle (état du panier / commande en cours) ─────
export const conversations = intelligenceSchema.table('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  query: text('query').notNull(),
  response: text('response'),
  agentType: text('agent_type'),
  zoneId: uuid('zone_id'),
  mode: text('mode').default('text').notNull(),
  audioUrl: text('audio_url'),
  isWaitingForInput: boolean('is_waiting_for_input').default(false).notNull(),
  missingSlots: jsonb('missing_slots'),
  executionPath: jsonb('execution_path'),
  confidenceScore: doublePrecision('confidence_score'),
  userIntent: text('user_intent'),
  needsFollowUp: boolean('needs_follow_up').default(false).notNull(),
  totalTokensUsed: integer('total_tokens_used').default(0).notNull(),
  responseTimeMs: integer('response_time_ms'),
  auditTrailId: text('audit_trail_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('conversations_user_idx').on(t.userId),
  index('conversations_agent_idx').on(t.agentType),
  index('conversations_created_idx').on(t.createdAt),
  index('conversations_followup_idx').on(t.needsFollowUp),
  uniqueIndex('conversations_audit_unique').on(t.auditTrailId),
]);

// ── Mémoire courte de l'agent (slots persistés entre tours) ────────────────
export const agentContextMemory = intelligenceSchema.table('agent_context_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  marketOfferId: uuid('market_offer_id'),
  contextKey: text('context_key').notNull(),
  contextValue: jsonb('context_value').notNull(),
  source: text('source').default('AGENT').notNull(),
  confidence: doublePrecision('confidence'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('acm_user_idx').on(t.userId),
  index('acm_key_idx').on(t.contextKey),
  uniqueIndex('acm_user_key_unique').on(t.userId, t.contextKey),
]);

// ── Réputation (cœur de confiance marketplace) ─────────────────────────────
export const trustScores = intelligenceSchema.table('trust_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').unique().notNull(),
  globalScore: doublePrecision('global_score').default(0).notNull(),
  reliabilityIndex: doublePrecision('reliability_index').default(0).notNull(),
  qualityIndex: doublePrecision('quality_index').default(0).notNull(),
  complianceIndex: doublePrecision('compliance_index').default(0).notNull(),
  resilienceBonus: doublePrecision('resilience_bonus').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

// Justification du "pourquoi" d'un score (transparence de la réputation).
export const aiRatingReasonings = intelligenceSchema.table('ai_rating_reasonings', {
  id: uuid('id').primaryKey().defaultRandom(),
  trustScoreId: uuid('trust_score_id').notNull(),
  agentName: text('agent_name').notNull(),
  justification: text('justification').notNull(),
  dataPoints: jsonb('data_points').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('ai_rating_trust_idx').on(t.trustScoreId),
  index('ai_rating_agent_idx').on(t.agentName),
]);

export default {
  auditLogs,
  agentActions,
  conversations,
  agentContextMemory,
  trustScores,
  aiRatingReasonings,
};

export type AuditLog = InferModel<typeof auditLogs>;
export type AgentAction = InferModel<typeof agentActions>;
export type Conversation = InferModel<typeof conversations>;
export type AgentContextMemory = InferModel<typeof agentContextMemory>;
export type TrustScore = InferModel<typeof trustScores>;
export type AiRatingReasoning = InferModel<typeof aiRatingReasonings>;
