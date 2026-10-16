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
  date,
  jsonb,
  boolean,
  integer,
  doublePrecision,
  index,
  uniqueIndex,
  check,
  AnyPgColumn, } from 'drizzle-orm/pg-core';
import { intelligenceSchema, agentActionStatusEnum, validationPriorityEnum } from './_config';
import { sql, type InferModel } from 'drizzle-orm';
import { orders } from './marketplace';
import { zones } from './governance';
import { users } from './auth';
import { auctions, buyerProfiles, marketOffers, producers, products } from './marketplace';
import { subCategories } from './governance';

// ── Audit transactionnel ─────────────────────────────────────────────────
export const auditLogs = intelligenceSchema.table('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).notNull(),
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
  orderId: uuid('order_id').references((): AnyPgColumn => orders.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  auditTrailId: text('audit_trail_id'),
  aiReasoning: text('ai_reasoning'),
  adminNotes: text('admin_notes'),
  validatedById: text('validated_by_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('agent_actions_status_idx').on(t.status),
  index('agent_actions_user_idx').on(t.userId),
  index('agent_actions_batch_idx').on(t.batchId),
  index('agent_actions_name_idx').on(t.agentName),
  uniqueIndex('agent_actions_order_unique').on(t.orderId),
  // Optimisation : la file d'attente de validation = pending triés par priorité
  index('agent_actions_queue_idx').on(t.status, t.priority),
]);

// ── Persistance conversationnelle (état du panier / commande en cours) ─────
export const conversations = intelligenceSchema.table('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'restrict' }).notNull(),
  query: text('query').notNull(),
  response: text('response'),
  agentType: text('agent_type'),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
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
// ── Réputation (cœur de confiance marketplace) ─────────────────────────────
export const trustScores = intelligenceSchema.table('trust_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }).unique().notNull(),
  globalScore: doublePrecision('global_score').default(0).notNull(),
  reliabilityIndex: doublePrecision('reliability_index').default(0).notNull(),
  qualityIndex: doublePrecision('quality_index').default(0).notNull(),
  complianceIndex: doublePrecision('compliance_index').default(0).notNull(),
  resilienceBonus: doublePrecision('resilience_bonus').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

// Justification du "pourquoi" d'un score (transparence de la réputation).
// ── Événements de modération (journal auditable des strikes) ───────────────
// Chaque mention d'un produit interdit / scam est journalisée ici. Le nombre
// de strikes d'un utilisateur = COUNT sur cette table (source de vérité DB).
export const moderationEvents = intelligenceSchema.table('moderation_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
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
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
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
  auctionId: uuid('auction_id').references((): AnyPgColumn => auctions.id, { onDelete: 'cascade' }),                    // si AUCTION_INVITE
  marketOfferId: uuid('market_offer_id').references((): AnyPgColumn => marketOffers.id, { onDelete: 'cascade' }),           // si NEW_PRODUCT_ALERT
  targetProducerId: uuid('target_producer_id').references((): AnyPgColumn => producers.id, { onDelete: 'cascade' }),
  targetBuyerId: uuid('target_buyer_id').references((): AnyPgColumn => buyerProfiles.id, { onDelete: 'cascade' }),
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'set null' }),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),
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
  solicitationId: uuid('solicitation_id').references((): AnyPgColumn => solicitations.id, { onDelete: 'set null' }),
  channel: text('channel').notNull(),               // WHATSAPP | EMAIL | PUSH | IN_APP
  recipientUserId: uuid('recipient_user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
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

// ── Suivi commercial (relances manuelles côté dashboard) ────────────────────
// Un statut de suivi par utilisateur (pas par tour de conversation) : le
// commercial relance une personne, pas un message isolé. L'envoi réel du
// message passe par le canal WhatsApp existant côté backend (WhatsAppChannel) ;
// cette table ne porte que l'état de suivi, jamais le contenu du message
// (journalisé dans audit_logs, action=COMMERCIAL_OUTBOUND).
export const commercialFollowupStatusEnum = ['NONE', 'TO_FOLLOW_UP', 'FOLLOWED_UP', 'RESOLVED', 'NOT_INTERESTED'] as const;

export const commercialFollowups = intelligenceSchema.table('commercial_followups', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'cascade' }).unique().notNull(),
  status: text('status').default('NONE').notNull(),
  assignedCommercialId: uuid('assigned_commercial_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  lastFollowUpAt: timestamp('last_follow_up_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('commercial_followups_status_idx').on(t.status),
  check('commercial_followups_status_chk', sql`${t.status} IN ('NONE','TO_FOLLOW_UP','FOLLOWED_UP','RESOLVED','NOT_INTERESTED')`),
  index('commercial_followups_assigned_idx').on(t.assignedCommercialId),
]);

// ── Diffusion proactive des disponibilités (campagnes WhatsApp) ─────────────────────────────────────
// Miroir de la migration 0016 (créée d'abord côté backend — voir backend docs/PROACTIVE_AVAILABILITY_CAMPAIGNS.md).
// Une campagne n'est pas un message : chaque destinataire (availability_campaign_recipients) a son propre suivi, unique par
// (campagne, exécution, téléphone) — c'est la garde ANTI-DOUBLON.
export const availabilityCampaignStatusEnum = ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED'] as const;
export const availabilityCampaignFrequencyEnum = ['ONCE', 'WEEKLY', 'CUSTOM_DAYS'] as const;
export const availabilityRecipientStatusEnum = ['PREPARED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED', 'SKIPPED'] as const;
export const communicationConsentStatusEnum = ['OPTED_IN', 'OPTED_OUT'] as const;
export const availabilityInterestKindEnum = ['INTEREST', 'PRICE_REQUEST', 'INFO_REQUEST', 'PREORDER_STARTED', 'DECLINED'] as const;
export const availabilityInterestStatusEnum = ['OPEN', 'PRODUCER_NOTIFIED', 'CLOSED'] as const;

export const availabilityCampaigns = intelligenceSchema.table('availability_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  status: text('status').default('DRAFT').notNull(),
  audience: jsonb('audience').default({}).notNull(),
  offerFilter: jsonb('offer_filter').default({}).notNull(),
  sendAt: timestamp('send_at'),
  frequency: text('frequency').default('ONCE').notNull(),
  intervalDays: integer('interval_days'),
  responseWindowHours: integer('response_window_hours').default(48).notNull(),
  deliveryDate: date('delivery_date'),
  nextRunAt: timestamp('next_run_at'),
  lastRunKey: text('last_run_key'),
  contentVersion: integer('content_version').default(1).notNull(),
  contentHash: text('content_hash'),
  preview: jsonb('preview'),
  validatedAt: timestamp('validated_at'),
  validatedById: uuid('validated_by_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  createdById: uuid('created_by_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  cancelledAt: timestamp('cancelled_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('availability_campaigns_due_idx').on(t.status, t.nextRunAt),
  index('availability_campaigns_validated_by_idx').on(t.validatedById),
  index('availability_campaigns_created_by_idx').on(t.createdById),
  check('availability_campaigns_status_chk', sql`${t.status} in ('DRAFT','SCHEDULED','RUNNING','COMPLETED','CANCELLED','FAILED')`),
  check('availability_campaigns_frequency_chk', sql`${t.frequency} in ('ONCE','WEEKLY','CUSTOM_DAYS')`),
  check('availability_campaigns_version_chk', sql`${t.contentVersion} >= 1`),
  check('availability_campaigns_interval_chk', sql`${t.intervalDays} is null or interval_days >= 1`),
  check('availability_campaigns_window_chk', sql`${t.responseWindowHours} >= 1`),
]);

export const availabilityCampaignRecipients = intelligenceSchema.table('availability_campaign_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references((): AnyPgColumn => availabilityCampaigns.id, { onDelete: 'cascade' }).notNull(),
  runKey: text('run_key').notNull(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  phone: text('phone').notNull(),
  status: text('status').default('PREPARED').notNull(),
  skipReason: text('skip_reason'),
  lastError: text('last_error'),
  outboxId: uuid('outbox_id').references((): AnyPgColumn => notificationOutbox.id, { onDelete: 'set null' }),
  providerRef: text('provider_ref'),
  offers: jsonb('offers').default([]).notNull(),
  contentVersion: integer('content_version').default(1).notNull(),
  queuedAt: timestamp('queued_at'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  repliedAt: timestamp('replied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('availability_recipients_run_phone_uq').on(t.campaignId, t.runKey, t.phone),
  index('availability_recipients_provider_ref_idx').on(t.providerRef),
  index('availability_recipients_phone_sent_idx').on(t.phone, t.sentAt),
  index('availability_recipients_user_idx').on(t.userId),
  index('availability_recipients_outbox_idx').on(t.outboxId),
  check('availability_recipients_status_chk', sql`${t.status} in ('PREPARED','QUEUED','SENT','DELIVERED','READ','REPLIED','FAILED','SKIPPED')`),
]);

export const communicationConsents = intelligenceSchema.table('communication_consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  topic: text('topic').default('AVAILABILITY_CAMPAIGNS').notNull(),
  status: text('status').notNull(),
  source: text('source').notNull(),
  proof: jsonb('proof').default({}).notNull(),
  consentedAt: timestamp('consented_at'),
  revokedAt: timestamp('revoked_at'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('communication_consents_phone_topic_uq').on(t.phone, t.topic),
  index('communication_consents_user_idx').on(t.userId),
  check('communication_consents_status_chk', sql`${t.status} in ('OPTED_IN','OPTED_OUT')`),
  check('communication_consents_version_chk', sql`${t.version} >= 1`),
]);

export const availabilityInterests = intelligenceSchema.table('availability_interests', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references((): AnyPgColumn => availabilityCampaigns.id, { onDelete: 'cascade' }).notNull(),
  recipientId: uuid('recipient_id').references((): AnyPgColumn => availabilityCampaignRecipients.id, { onDelete: 'cascade' }).notNull(),
  phone: text('phone').notNull(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  productId: uuid('product_id').references((): AnyPgColumn => products.id, { onDelete: 'set null' }),
  productLabel: text('product_label').notNull(),
  quantity: doublePrecision('quantity'),
  unit: text('unit'),
  kind: text('kind').notNull(),
  status: text('status').default('OPEN').notNull(),
  messageRef: text('message_ref').notNull(),
  changes: jsonb('changes').default({}).notNull(),
  producerNotifiedAt: timestamp('producer_notified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  uniqueIndex('availability_interests_recipient_msg_label_uq').on(t.recipientId, t.messageRef, t.productLabel),
  index('availability_interests_campaign_idx').on(t.campaignId),
  index('availability_interests_user_idx').on(t.userId),
  index('availability_interests_product_idx').on(t.productId),
  check('availability_interests_kind_chk', sql`${t.kind} in ('INTEREST','PRICE_REQUEST','INFO_REQUEST','PREORDER_STARTED','DECLINED')`),
  check('availability_interests_status_chk', sql`${t.status} in ('OPEN','PRODUCER_NOTIFIED','CLOSED')`),
]);

export default {
  auditLogs,
  agentActions,
  conversations,
  trustScores,
  moderationEvents,
  demandSignals,
  solicitations,
  notificationOutbox,
  commercialFollowups,
  availabilityCampaigns,
  availabilityCampaignRecipients,
  communicationConsents,
  availabilityInterests,
};

export type AuditLog = InferModel<typeof auditLogs>;
export type AgentAction = InferModel<typeof agentActions>;
export type Conversation = InferModel<typeof conversations>;
export type TrustScore = InferModel<typeof trustScores>;
export type ModerationEvent = InferModel<typeof moderationEvents>;
export type DemandSignal = InferModel<typeof demandSignals>;
export type Solicitation = InferModel<typeof solicitations>;
export type NotificationOutbox = InferModel<typeof notificationOutbox>;
export type CommercialFollowup = InferModel<typeof commercialFollowups>;
export type AvailabilityCampaign = InferModel<typeof availabilityCampaigns>;
export type AvailabilityCampaignRecipient = InferModel<typeof availabilityCampaignRecipients>;
export type CommunicationConsent = InferModel<typeof communicationConsents>;
export type AvailabilityInterest = InferModel<typeof availabilityInterests>;
