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

// Audit Logs
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
]);

// Agent Actions
export const agentActions = intelligenceSchema.table('agent_actions', {
	id: uuid('id').primaryKey().defaultRandom(),
	agentName: text('agent_name').notNull(),
	actionType: text('action_type').notNull(),
	// Keep as text to match existing DB and avoid unsafe ALTER TYPE migrations
	batchId: text('batch_id'),
	payload: jsonb('payload'),
	status: agentActionStatusEnum('status').default('PENDING').notNull(),
	priority: validationPriorityEnum('priority').default('MEDIUM').notNull(),
	orderId: uuid('order_id'),
	userId: uuid('user_id'),
	auditTrailId: text('audit_trail_id'),
	aiReasoning: text('ai_reasoning'),
	adminNotes: text('admin_notes'),
	// Keep as text to match existing DB and avoid unsafe ALTER TYPE migrations
	validatedById: text('validated_by_id'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
	index('agent_actions_status_idx').on(t.status),
	index('agent_actions_batch_idx').on(t.batchId),
	index('agent_actions_name_idx').on(t.agentName),
	uniqueIndex('agent_actions_order_unique').on(t.orderId),
]);

// Agent Telemetry
export const agentTelemetry = intelligenceSchema.table('agent_telemetry', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull(),
	latitude: doublePrecision('latitude'),
	longitude: doublePrecision('longitude'),
	battery: integer('battery'),
	signal: text('signal'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
	index('agent_telemetry_user_idx').on(t.userId),
]);

// ExternalContext (files and vectorized assets)
export const externalContexts = intelligenceSchema.table('external_context_files', {
	id: uuid('id').primaryKey().defaultRandom(),
	fileName: text('file_name').notNull(),
	fileType: text('file_type').notNull(),
	fileUrl: text('file_url').notNull(),
	category: text('category'),
	zoneId: uuid('zone_id'),
	isVectorized: boolean('is_vectorized').default(false).notNull(),
	mcpServerId: text('mcp_server_id'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
});
// Conversations
export const conversations = intelligenceSchema.table('conversations', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull(),
	query: text('query').notNull(),
	response: text('response'),
	agentType: text('agent_type'),
	crop: text('crop'),
	zoneId: uuid('zone_id'),
	mode: text('mode').default('text').notNull(),
	audioUrl: text('audio_url'),
	isWaitingForInput: boolean('is_waiting_for_input').default(false).notNull(),
	missingSlots: jsonb('missing_slots'),
	executionPath: jsonb('execution_path'),
	confidenceScore: doublePrecision('confidence_score'),
	totalTokensUsed: integer('total_tokens_used').default(0).notNull(),
	responseTimeMs: integer('response_time_ms'),
	auditTrailId: text('audit_trail_id'),
	anomalyId: uuid('anomaly_id'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
	index('conversations_user_idx').on(t.userId),
	index('conversations_agent_idx').on(t.agentType),
	index('conversations_created_idx').on(t.createdAt),
	uniqueIndex('conversations_audit_unique').on(t.auditTrailId),
]);

// Territory Event
export const territoryEvents = intelligenceSchema.table('territory_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	zoneId: uuid('zone_id').notNull(),
	eventType: text('event_type').notNull(),
	payload: jsonb('payload'),
	meta: jsonb('meta'),
	status: text('status').default('NEW').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	processedAt: timestamp('processed_at'),
	processedById: uuid('processed_by_id'),
}, (t) => [
	index('territory_events_zone_idx').on(t.zoneId),
	index('territory_events_type_idx').on(t.eventType),
]);

// Anomalies
export const anomalies = intelligenceSchema.table('anomalies', {
	id: uuid('id').primaryKey().defaultRandom(),
	zoneId: uuid('zone_id').notNull(),
	source: text('source'),
	level: text('level').notNull(),
	title: text('title').notNull(),
	message: text('message'),
	details: jsonb('details'),
	isResolved: boolean('is_resolved').default(false).notNull(),
	resolvedById: uuid('resolved_by_id'),
	resolvedAt: timestamp('resolved_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
	index('anomalies_zone_idx').on(t.zoneId),
	index('anomalies_resolved_idx').on(t.isResolved),
]);

// Trust Scores
export const trustScores = intelligenceSchema.table('trust_scores', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').unique().notNull(),
	globalScore: doublePrecision('global_score').default(0.0).notNull(),
	reliabilityIndex: doublePrecision('reliability_index').default(0.0).notNull(),
	qualityIndex: doublePrecision('quality_index').default(0.0).notNull(),
	complianceIndex: doublePrecision('compliance_index').default(0.0).notNull(),
	resilienceBonus: doublePrecision('resilience_bonus').default(0.0).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

// AI Rating Reasonings
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

// Relations (defined here to avoid circular imports)
// export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
// 	actor: one(() => users, { fields: [auditLogs.actorId], references: [users.id] }),
// }));

export default {
	auditLogs,
	agentActions,
	agentTelemetry,
	externalContexts,
	conversations,
	territoryEvents,
	anomalies,
	trustScores,
	aiRatingReasonings,
};

// Types
export type AgentAction = InferModel<typeof agentActions>;
export type AuditLog = InferModel<typeof auditLogs>;
export type Conversation = InferModel<typeof conversations>;
export type ExternalContext = InferModel<typeof externalContexts>;
export type TrustScore = InferModel<typeof trustScores>;