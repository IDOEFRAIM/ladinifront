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

// ── Événements de modération (journal auditable des strikes) ───────────────
// Chaque mention d'un produit interdit / scam est journalisée ici. Le nombre
// de strikes d'un utilisateur = COUNT sur cette table (source de vérité DB).
export const moderationEvents = intelligenceSchema.table('moderation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  phone: text('phone').notNull(),
  kind: text('kind').notNull(),           // PROHIBITED_PRODUCT | SCAM
  matchedTerm: text('matched_term'),
  excerpt: text('excerpt'),
  actionTaken: text('action_taken'),      // WARNED | BANNED
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('moderation_events_phone_idx').on(t.phone),
  index('moderation_events_user_idx').on(t.userId),
  index('moderation_events_kind_idx').on(t.kind),
]);

// ── Signaux de demande non satisfaite (ce que les gens cherchent en vain) ──
// Quand une recherche catalogue ne retourne rien et qu'aucune catégorie ne
// correspond, on agrège la demande ici (upsert + incrément) pour piloter
// l'ouverture de nouvelles catégories / le sourcing.
export const demandSignals = intelligenceSchema.table('demand_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  normalizedTerm: text('normalized_term').notNull(),
  rawQuery: text('raw_query').notNull(),
  phone: text('phone'),
  userId: uuid('user_id'),
  zoneId: uuid('zone_id'),
  occurrences: integer('occurrences').default(1).notNull(),
  resolved: boolean('resolved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('demand_signals_term_unique').on(t.normalizedTerm),
  index('demand_signals_occurrences_idx').on(t.occurrences),
]);

// ── ORCHESTRATION PROACTIVE ────────────────────────────────────────────────
// Sollicitations automatiques (enchères → producteurs, nouveaux produits →
// acheteurs). Porte l'ÉTAT MÉTIER + l'idempotence (une sollicitation unique par
// couple cible). Le taux de conversion = RESPONDED / NOTIFIED se calcule ici.
export const solicitations = intelligenceSchema.table('solicitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: text('kind').notNull(),                     // AUCTION_INVITE | NEW_PRODUCT_ALERT
  auctionId: uuid('auction_id'),                    // si AUCTION_INVITE
  marketOfferId: uuid('market_offer_id'),           // si NEW_PRODUCT_ALERT
  targetProducerId: uuid('target_producer_id'),
  targetBuyerId: uuid('target_buyer_id'),
  subCategoryId: uuid('sub_category_id'),
  zoneId: uuid('zone_id'),
  status: text('status').default('PENDING').notNull(), // PENDING→NOTIFIED→RESPONDED→EXPIRED|SKIPPED
  notifiedAt: timestamp('notified_at'),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  // 🔒 Idempotence : une seule sollicitation par (enchère, producteur) /
  // (offre, acheteur). Les NULL Postgres étant distincts, les deux index
  // coexistent sans se gêner selon le kind.
  uniqueIndex('solicitations_auction_producer_uq').on(t.auctionId, t.targetProducerId),
  uniqueIndex('solicitations_offer_buyer_uq').on(t.marketOfferId, t.targetBuyerId),
  index('solicitations_kind_status_idx').on(t.kind, t.status),
  index('solicitations_auction_idx').on(t.auctionId),
]);

// File d'attente durable de messages (Outbox Pattern). Le cron métier écrit ICI
// (aucun appel externe) ; un worker séparé lit et envoie. Découplage total :
// une panne Twilio/Email ne fait pas planter l'orchestration.
export const notificationOutbox = intelligenceSchema.table('notification_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  solicitationId: uuid('solicitation_id'),
  channel: text('channel').notNull(),               // WHATSAPP | EMAIL | PUSH | IN_APP
  recipientUserId: uuid('recipient_user_id'),
  recipientPhone: text('recipient_phone'),
  templateKey: text('template_key').notNull(),      // ex: AUCTION_INVITE_PRODUCER
  payload: jsonb('payload').notNull(),              // variables du template + quick-action 1-clic
  dedupeKey: text('dedupe_key').notNull(),          // 🔒 anti double-envoi
  status: text('status').default('PENDING').notNull(), // PENDING→SENDING→SENT|FAILED|DEAD
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  nextAttemptAt: timestamp('next_attempt_at').defaultNow().notNull(),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex('outbox_dedupe_uq').on(t.dedupeKey),
  // Le dispatcher scanne les messages « dus » : status + next_attempt_at.
  index('outbox_due_idx').on(t.status, t.nextAttemptAt),
  index('outbox_solicitation_idx').on(t.solicitationId),
]);

export default {
  auditLogs,
  agentActions,
  conversations,
  agentContextMemory,
  trustScores,
  aiRatingReasonings,
  moderationEvents,
  demandSignals,
  solicitations,
  notificationOutbox,
};

export type AuditLog = InferModel<typeof auditLogs>;
export type AgentAction = InferModel<typeof agentActions>;
export type Conversation = InferModel<typeof conversations>;
export type AgentContextMemory = InferModel<typeof agentContextMemory>;
export type TrustScore = InferModel<typeof trustScores>;
export type AiRatingReasoning = InferModel<typeof aiRatingReasonings>;
export type ModerationEvent = InferModel<typeof moderationEvents>;
export type DemandSignal = InferModel<typeof demandSignals>;
export type Solicitation = InferModel<typeof solicitations>;
export type NotificationOutbox = InferModel<typeof notificationOutbox>;
