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

// ── Cerveau IA : Recommandations stockées ───────────────────────────────
export const aiRecommendations = intelligenceSchema.table('ai_recommendations', {
	id: uuid('id').primaryKey().defaultRandom(),
	cropCycleId: uuid('crop_cycle_id'),
	farmId: uuid('farm_id'),
	userId: uuid('user_id'),
	agentName: text('agent_name').notNull(), // ex: 'disease_alert', 'fertilizer_advisor', 'irrigation_planner'
	recommendationType: text('recommendation_type').notNull(), // ALERTE, CONSEIL, PLANIFICATION, DIAGNOSTIC
	title: text('title').notNull(),
	content: text('content').notNull(),
	confidenceScore: doublePrecision('confidence_score'),
	dataSourcesUsed: jsonb('data_sources_used'), // { "weather": true, "soil": true, "bbch": 60 }
	priority: text('priority').default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, CRITICAL
	status: text('status').default('PENDING').notNull(), // PENDING, VIEWED, APPLIED, DISMISSED
	appliedAt: timestamp('applied_at'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
	index('ai_rec_farm_idx').on(t.farmId),
	index('ai_rec_crop_cycle_idx').on(t.cropCycleId),
	index('ai_rec_user_idx').on(t.userId),
	index('ai_rec_type_idx').on(t.recommendationType),
	index('ai_rec_status_idx').on(t.status),
	index('ai_rec_created_idx').on(t.createdAt),
]);

// ── Cerveau IA : Cache météo externe (NASA POWER / Open-Meteo) ─────────
export const weatherDataLogs = intelligenceSchema.table('weather_data_logs', {
	id: uuid('id').primaryKey().defaultRandom(),
	zoneId: uuid('zone_id'),
	farmId: uuid('farm_id'),
	latitude: doublePrecision('latitude').notNull(),
	longitude: doublePrecision('longitude').notNull(),
	recordDate: timestamp('record_date').notNull(),
	tempMin: doublePrecision('temp_min'),
	tempMax: doublePrecision('temp_max'),
	tempMean: doublePrecision('temp_mean'),
	precipitationMm: doublePrecision('precipitation_mm'),
	humidityPercent: doublePrecision('humidity_percent'),
	windSpeedKmh: doublePrecision('wind_speed_kmh'),
	solarRadiation: doublePrecision('solar_radiation'), // MJ/m²
	evapotranspiration: doublePrecision('evapotranspiration'), // mm (ETo Penman-Monteith)
	gddContribution: doublePrecision('gdd_contribution'), // max(0, tempMean - baseTemp)
	source: text('source').default('OPEN_METEO').notNull(), // OPEN_METEO, NASA_POWER, STATION_LOCAL
	rawPayload: jsonb('raw_payload'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
	index('wdl_zone_idx').on(t.zoneId),
	index('wdl_farm_idx').on(t.farmId),
	index('wdl_date_idx').on(t.recordDate),
	uniqueIndex('wdl_farm_date_source_unique').on(t.farmId, t.recordDate, t.source),
]);

// ── Cerveau IA : Mémoire contextuelle de l'agent (continuité dialogue) ──
export const agentContextMemory = intelligenceSchema.table('agent_context_memory', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id').notNull(),
	farmId: uuid('farm_id'),
	cropCycleId: uuid('crop_cycle_id'),
	contextKey: text('context_key').notNull(), // ex: 'last_observed_bbch', 'pending_fertilization', 'disease_risk_mildiou'
	contextValue: jsonb('context_value').notNull(), // flexible JSON payload
	source: text('source').default('AGENT').notNull(), // AGENT, USER_INPUT, SENSOR, WEATHER
	confidence: doublePrecision('confidence'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
	index('acm_user_idx').on(t.userId),
	index('acm_farm_idx').on(t.farmId),
	index('acm_key_idx').on(t.contextKey),
	uniqueIndex('acm_user_farm_key_unique').on(t.userId, t.farmId, t.contextKey),
]);

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
	aiRecommendations,
	weatherDataLogs,
	agentContextMemory,
};

// Types
export type AgentAction = InferModel<typeof agentActions>;
export type AuditLog = InferModel<typeof auditLogs>;
export type Conversation = InferModel<typeof conversations>;
export type ExternalContext = InferModel<typeof externalContexts>;
export type TrustScore = InferModel<typeof trustScores>;
export type AiRecommendation = InferModel<typeof aiRecommendations>;
export type WeatherDataLog = InferModel<typeof weatherDataLogs>;
export type AgentContextMemory = InferModel<typeof agentContextMemory>;