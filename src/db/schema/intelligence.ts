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
  varchar,
  numeric,
  unique
} from 'drizzle-orm/pg-core';
import { intelligenceSchema, agentActionStatusEnum, validationPriorityEnum } from './_config';
import { type InferModel } from 'drizzle-orm';
import { cropCycles } from './marketplace';
// ── Crop Knowledge & Agronomy ───────────────────────────────────────────

export const cropProfiles = intelligenceSchema.table('crop_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  cropName: varchar('crop_name', { length: 100 }).notNull(),
  zoneCategory: varchar('zone_category', { length: 50 }).notNull(),
  variety: varchar('variety', { length: 100 }),
  scientificName: varchar('scientific_name', { length: 255 }),
  cycleDays: integer('cycle_days').notNull(),
  
  // Constantes thermiques avancées (GDD / DJC)
  baseTemperatureC: numeric('base_temperature_c', { precision: 5, scale: 2 }),
  maxTemperatureC: numeric('max_temperature_c', { precision: 5, scale: 2 }),
  expectedGdd: numeric('expected_gdd', { precision: 8, scale: 2 }),
  
  depthCm: integer('depth_cm').notNull(),
  phMin: numeric('ph_min', { precision: 4, scale: 2 }),
  phMax: numeric('ph_max', { precision: 4, scale: 2 }),
  organicMatterMinTha: numeric('organic_matter_min_tha', { precision: 10, scale: 2 }).notNull().default('0'),
  
  // Hydrologie et Coefficients Culturaux (Moteur d'irrigation WhatsApp)
  waterStrategy: text('water_strategy'),
  waterNeedsMmPerCycle: numeric('water_needs_mm_per_cycle', { precision: 8, scale: 2 }),
  kcStages: jsonb('kc_stages').notNull().default([]), // Coefficients Kc associés aux stades phénologiques [{ stage: "initial", kc: 0.4, duration_days: 20 }]
  criticalStopsDrought: jsonb('critical_stops_drought').notNull().default([]), // Stades où le stress hydrique bloque le rendement
  
  // Besoins globaux d'exportations pour calculs de fumure personnalisés
  nutrientRequirementsPerTon: jsonb('nutrient_requirements_per_ton').notNull().default({ N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0 }),
  salinityToleranceEc: numeric('salinity_tolerance_ec', { precision: 4, scale: 2 }),
  
  interRowCm: numeric('inter_row_cm', { precision: 10, scale: 2 }).notNull(),
  interPlantCm: numeric('inter_plant_cm', { precision: 10, scale: 2 }).notNull(),
  seedsPocket: integer('seeds_pocket').notNull(),
  yieldMinTHa: numeric('yield_min_t_ha', { precision: 10, scale: 2 }).notNull().default('0'),
  yieldMaxTHa: numeric('yield_max_t_ha', { precision: 10, scale: 2 }).notNull().default('0'),
  
  phenologicalStages: jsonb('phenological_stages').notNull().default([]),
  keyPests: jsonb('key_pests').notNull().default([]),
  keyDiseases: jsonb('key_diseases').notNull().default([]),
  preFlightChecks: jsonb('pre_flight_checks').notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique('crop_profiles_unique_triplet').on(t.cropName, t.zoneCategory, t.variety),
  index('idx_crop_profiles_lookup').on(t.cropName, t.zoneCategory),
  index('idx_crop_profiles_active').on(t.isActive),
]);

export const cropFertilizerSteps = intelligenceSchema.table('crop_fertilizer_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  cropProfileId: uuid('crop_profile_id').notNull().references(() => cropProfiles.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  stage: varchar('stage', { length: 120 }).notNull(),
  bbchScaleId: integer('bbch_scale_id'),
  bbchScaleCode: varchar('bbch_scale_code', { length: 20 }), // Standardisation internationale (ex: 'BBCH_61')
  daysAfterSowing: integer('days_after_sowing'),
  productType: varchar('product_type', { length: 120 }).notNull(),
  nutrientTarget: jsonb('nutrient_target').default({ N: 0, P2O5: 0, K2O: 0, CaO: 0, MgO: 0 }),
  doseKgHa: numeric('dose_kg_ha', { precision: 10, scale: 2 }).notNull(),
  applicationMode: varchar('application_mode', { length: 120 }),
  efficiencyFactor: numeric('efficiency_factor', { precision: 3, scale: 2 }).default('1.00'), // Facteur de valorisation de l'engrais selon le mode d'application
  isMandatory: boolean('is_mandatory').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  unique('crop_fertilizer_steps_unique_order').on(t.cropProfileId, t.stepOrder),
  index('idx_crop_fertilizer_steps_profile').on(t.cropProfileId),
  index('idx_crop_fertilizer_steps_timing').on(t.daysAfterSowing),
]);

export const soilAnalyses = intelligenceSchema.table('soil_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  farmId: uuid('farm_id').notNull(),
  zoneId: uuid('zone_id'),
  sampleDate: timestamp('sample_date').notNull(),
  
  // Physico-chimie fondamentale du sol
  ph: numeric('ph', { precision: 4, scale: 2 }),
  salinityEc: numeric('salinity_ec', { precision: 5, scale: 2 }), // Conductivité électrique pour gestion des stress osmotiques
  cationExchangeCapacity: numeric('cation_exchange_capacity', { precision: 6, scale: 2 }), // CEC (meq/100g) essentielle pour stocker/retenir les nutriments
  carbonNitrogenRatio: numeric('carbon_nitrogen_ratio', { precision: 5, scale: 2 }), // Rapport C/N pour modéliser la faim d'azote
  organicMatterPercent: numeric('organic_matter_percent', { precision: 5, scale: 2 }),
  
  // Macronutriments et éléments secondaires
  nitrogenPpm: numeric('nitrogen_ppm', { precision: 8, scale: 2 }),
  phosphorusPpm: numeric('phosphorus_ppm', { precision: 8, scale: 2 }),
  potassiumPpm: numeric('potassium_ppm', { precision: 8, scale: 2 }),
  calciumPpm: numeric('calcium_ppm', { precision: 8, scale: 2 }),
  magnesiumPpm: numeric('magnesium_ppm', { precision: 8, scale: 2 }),
  
  // Texture et propriétés hydriques calculées du sol (Résilience sécheresse)
  texture: varchar('texture', { length: 50 }), // 'Sableux', 'Argileux', 'Limoneux', etc.
  clayPercent: numeric('clay_percent', { precision: 5, scale: 2 }),
  sandPercent: numeric('sand_percent', { precision: 5, scale: 2 }),
  siltPercent: numeric('silt_percent', { precision: 5, scale: 2 }),
  bulkDensity: numeric('bulk_density', { precision: 4, scale: 2 }), // Densité apparente pour conversions mg/kg en kg/ha
  wiltingPointPercent: numeric('wilting_point_percent', { precision: 4, scale: 2 }), // Point de flétrissement permanent (PFP)
  fieldCapacityPercent: numeric('field_capacity_percent', { precision: 4, scale: 2 }), // Capacité au champ (CC)
  
  rawLabResults: jsonb('raw_lab_results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('idx_soil_analyses_farm').on(t.farmId),
  index('idx_soil_analyses_zone').on(t.zoneId),
  index('idx_soil_analyses_date').on(t.sampleDate),
]);

// ── Operations & Agent Core ─────────────────────────────────────────────

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
]);

export const agentTelemetry = intelligenceSchema.table('agent_telemetry', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  battery: integer('battery'),
  signal: text('signal'),
  deviceInfo: jsonb('device_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('agent_telemetry_user_idx').on(t.userId),
]);

export const externalContexts = intelligenceSchema.table('external_context_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  category: text('category'),
  zoneId: uuid('zone_id'),
  cropProfileId: uuid('crop_profile_id'),
  isVectorized: boolean('is_vectorized').default(false).notNull(),
  mcpServerId: text('mcp_server_id'),
  embeddingVersion: text('embedding_version'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('ext_context_zone_idx').on(t.zoneId),
  index('ext_context_category_idx').on(t.category),
]);

export const conversations = intelligenceSchema.table('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  farmId: uuid('farm_id'),
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
  userIntent: text('user_intent'),
  needsFollowUp: boolean('needs_follow_up').default(false).notNull(),
  totalTokensUsed: integer('total_tokens_used').default(0).notNull(),
  responseTimeMs: integer('response_time_ms'),
  auditTrailId: text('audit_trail_id'),
  anomalyId: uuid('anomaly_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index('conversations_user_idx').on(t.userId),
  index('conversations_farm_idx').on(t.farmId),
  index('conversations_agent_idx').on(t.agentType),
  index('conversations_created_idx').on(t.createdAt),
  index('conversations_followup_idx').on(t.needsFollowUp),
  uniqueIndex('conversations_audit_unique').on(t.auditTrailId),
]);

// ── Events, Anomalies & Trust ───────────────────────────────────────────

export const territoryEvents = intelligenceSchema.table('territory_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload'),
  meta: jsonb('meta'),
  severity: text('severity').default('INFO').notNull(),
  status: text('status').default('NEW').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
  processedById: uuid('processed_by_id'),
}, (t) => [
  index('territory_events_zone_idx').on(t.zoneId),
  index('territory_events_type_idx').on(t.eventType),
  index('territory_events_status_idx').on(t.status),
]);

export const anomalies = intelligenceSchema.table('anomalies', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').notNull(),
  farmId: uuid('farm_id'),
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
  index('anomalies_farm_idx').on(t.farmId),
  index('anomalies_resolved_idx').on(t.isResolved),
]);

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

// ── IA Core: Recommendations, Weather & Context ─────────────────────────

export const aiRecommendations = intelligenceSchema.table('ai_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  cropCycleId: uuid('crop_cycle_id'),
  farmId: uuid('farm_id'),
  userId: uuid('user_id'),
  agentName: text('agent_name').notNull(),
  recommendationType: text('recommendation_type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  actionableSteps: jsonb('actionable_steps').default([]),
  confidenceScore: doublePrecision('confidence_score'),
  dataSourcesUsed: jsonb('data_sources_used'),
  priority: text('priority').default('MEDIUM').notNull(),
  status: text('status').default('PENDING').notNull(),
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

export const weatherDataLogs = intelligenceSchema.table('weather_data_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id'),
  farmId: uuid('farm_id'),
  cropCycleId: uuid('crop_cycle_id')
    .references(() => cropCycles.id, { onDelete: 'cascade' }),
    cropSlug: varchar('crop_slug', { length: 255 }),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  recordDate: timestamp('record_date').notNull(),
  
  
  tempMin: doublePrecision('temp_min'),
  tempMax: doublePrecision('temp_max'),
  tempMean: doublePrecision('temp_mean'),
  tempDewPoint: doublePrecision('temp_dew_point'),
  
  precipitationMm: doublePrecision('precipitation_mm'),
  precipitationProbability: integer('precipitation_probability'),
  
  humidityPercent: doublePrecision('humidity_percent'),
  humidityMin: doublePrecision('humidity_min'),
  humidityMax: doublePrecision('humidity_max'),
  
  windSpeedKmh: doublePrecision('wind_speed_kmh'),
  windDirectionDegrees: integer('wind_direction_degrees'),
  windGustsKmh: doublePrecision('wind_gusts_kmh'),
  
  solarRadiation: doublePrecision('solar_radiation'),
  uvIndex: doublePrecision('uv_index'),
  
  evapotranspiration: doublePrecision('evapotranspiration'),
  gddContribution: doublePrecision('gdd_contribution'),
  leafWetnessDurationMinutes: integer('leaf_wetness_duration_minutes'),
  
  soilTemperatureDepth0cm: doublePrecision('soil_temperature_depth_0cm'),
  soilTemperatureDepth10cm: doublePrecision('soil_temperature_depth_10cm'),
  soilMoistureVolumetricPercent: doublePrecision('soil_moisture_volumetric_percent'),
  
  diseaseRiskIndex: jsonb('disease_risk_index'),
  alertTriggers: jsonb('alert_triggers'),
  whatsappPushedAlerts: jsonb('whatsapp_pushed_alerts'),
  
  forecastHorizonDays: integer('forecast_horizon_days').default(0).notNull(),
  source: text('source').default('OPEN_METEO').notNull(),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('wdl_zone_idx').on(t.zoneId),
  index('wdl_farm_idx').on(t.farmId),
  index('wdl_date_idx').on(t.recordDate),
  index('wdl_horizon_idx').on(t.forecastHorizonDays),
  index('wdl_cycle_date_idx').on(t.cropCycleId, t.recordDate),
  uniqueIndex('wdl_farm_date_source_horizon_unique').on(t.farmId, t.recordDate, t.source, t.forecastHorizonDays),
]);

export const agentContextMemory = intelligenceSchema.table('agent_context_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  farmId: uuid('farm_id'),
  cropCycleId: uuid('crop_cycle_id'),
  contextKey: text('context_key').notNull(),
  contextValue: jsonb('context_value').notNull(),
  source: text('source').default('AGENT').notNull(),
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
  cropProfiles,
  cropFertilizerSteps,
  soilAnalyses,
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

export type CropProfile = InferModel<typeof cropProfiles>;
export type CropFertilizerStep = InferModel<typeof cropFertilizerSteps>;
export type SoilAnalysis = InferModel<typeof soilAnalyses>;
export type AgentAction = InferModel<typeof agentActions>;
export type AuditLog = InferModel<typeof auditLogs>;
export type Conversation = InferModel<typeof conversations>;
export type ExternalContext = InferModel<typeof externalContexts>;
export type TrustScore = InferModel<typeof trustScores>;
export type AiRecommendation = InferModel<typeof aiRecommendations>;
export type WeatherDataLog = InferModel<typeof weatherDataLogs>;
export type AgentContextMemory = InferModel<typeof agentContextMemory>;