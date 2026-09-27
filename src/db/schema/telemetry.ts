import { uuid, text, timestamp, integer, doublePrecision, boolean, index, uniqueIndex, check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { intelligenceSchema } from './_config';
import { users } from './auth';

/**
 * TÉLÉMÉTRIE DE L'AGENT — historique append-only, un enregistrement par TOUR (message utilisateur traité).
 *
 * Alimentée par le backend Python (`ladini/core/turn_telemetry.py`), lue par le cockpit `/admin/monitoring`.
 * Best-effort : l'observabilité n'a JAMAIS le droit de casser un tour utilisateur.
 *
 * Confidentialité : le téléphone n'est JAMAIS stocké en clair (`phone_hash` = HMAC, `phone_last4` pour l'affichage
 * « +226 •••• 4582 »). Aucun payload d'outil. Extraits de messages redactés et tronqués. Rétention :
 * `AGENT_MONITORING_RETENTION_DAYS` (30 j par défaut) — la purge supprime les tours, les enfants suivent (CASCADE).
 *
 * Les colonnes filtrées/agrégées sont de vraies colonnes ; aucun JSON fourre-tout.
 */

const tz = { withTimezone: true } as const;

export const agentTurns = intelligenceSchema.table('agent_turns', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Session : suite de tours d'un même utilisateur séparés de < 30 min. Clé de regroupement calculée par l'agent
  // (relation logique volontairement SANS FK : `conversations` n'est pas alimentée par l'agent).
  conversationId: uuid('conversation_id').notNull(),
  userId: uuid('user_id').references((): AnyPgColumn => users.id, { onDelete: 'set null' }),
  phoneHash: text('phone_hash').notNull(),
  phoneLast4: text('phone_last4'),
  channel: text('channel').notNull().default('WHATSAPP'),
  userRole: text('user_role'),
  // Identifiant du message entrant + numéro de tentative Celery : un retry ne duplique pas le tour.
  messageSid: text('message_sid'),
  taskRetries: integer('task_retries').notNull().default(0),

  intent: text('intent'),
  intentConfidence: doublePrecision('intent_confidence'),
  workflow: text('workflow'),
  workflowStep: text('workflow_step'),
  goalStatus: text('goal_status'),
  outcome: text('outcome').notNull(),

  startedAt: timestamp('started_at', tz).notNull(),
  completedAt: timestamp('completed_at', tz).notNull(),
  durationMs: integer('duration_ms').notNull(),
  queueDurationMs: integer('queue_duration_ms'),

  dbQueryCount: integer('db_query_count').notNull().default(0),
  dbDurationMs: integer('db_duration_ms').notNull().default(0),
  dbMaxQueryMs: integer('db_max_query_ms').notNull().default(0),
  redisCommandCount: integer('redis_command_count').notNull().default(0),
  redisDurationMs: integer('redis_duration_ms').notNull().default(0),
  mcpCallCount: integer('mcp_call_count').notNull().default(0),
  mcpDurationMs: integer('mcp_duration_ms').notNull().default(0),
  llmCallCount: integer('llm_call_count').notNull().default(0),
  llmDurationMs: integer('llm_duration_ms').notNull().default(0),
  intentLlmDurationMs: integer('intent_llm_duration_ms').notNull().default(0),
  responseLlmDurationMs: integer('response_llm_duration_ms').notNull().default(0),
  llmFallbackCount: integer('llm_fallback_count').notNull().default(0),
  whatsappDurationMs: integer('whatsapp_duration_ms'),

  responseStatus: text('response_status').notNull(),
  errorCode: text('error_code'),
  errorCategory: text('error_category'),
  traceId: text('trace_id'),

  // Extraits REDACTÉS (numéros/emails/jetons masqués, tronqués) pour la timeline de session — jamais le texte brut.
  userMessageExcerpt: text('user_message_excerpt'),
  agentResponseExcerpt: text('agent_response_excerpt'),

  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
}, (t) => [
  index('agent_turns_created_idx').on(t.createdAt),
  index('agent_turns_conversation_idx').on(t.conversationId, t.startedAt),
  index('agent_turns_user_idx').on(t.userId),
  // Dernier tour d'un utilisateur (continuité de session, sessions actives) — 1 lecture indexée par tour.
  index('agent_turns_phone_idx').on(t.phoneHash, t.createdAt),
  index('agent_turns_intent_idx').on(t.intent, t.createdAt),
  index('agent_turns_workflow_idx').on(t.workflow, t.createdAt),
  index('agent_turns_outcome_idx').on(t.outcome, t.createdAt),
  index('agent_turns_error_idx').on(t.errorCode, t.createdAt).where(sql`${t.errorCode} IS NOT NULL`),
  index('agent_turns_trace_idx').on(t.traceId).where(sql`${t.traceId} IS NOT NULL`),
  uniqueIndex('agent_turns_sid_retry_uq').on(t.messageSid, t.taskRetries).where(sql`${t.messageSid} IS NOT NULL`),
  check('agent_turns_outcome_chk', sql`${t.outcome} IN ('COMPLETED','CLARIFICATION','WAITING_USER','BLOCKED','HUMAN_REQUIRED','FALLBACK','ERROR')`),
  check('agent_turns_response_status_chk', sql`${t.responseStatus} IN ('SENT','FAILED','SKIPPED','DUPLICATE')`),
  check('agent_turns_channel_chk', sql`${t.channel} IN ('WHATSAPP','WEBCHAT','API')`),
  check('agent_turns_error_category_chk', sql`${t.errorCategory} IS NULL OR ${t.errorCategory} IN ('TOOL','LLM','DB','REDIS','WHATSAPP','TIMEOUT','VALIDATION','SECURITY','INTERNAL')`),
  check('agent_turns_duration_chk', sql`${t.durationMs} >= 0`),
]);

// Appels d'outils MCP d'un tour. Aucun argument ni résultat stocké (secrets / PII) : seulement nom, durée, statut.
export const agentToolCalls = intelligenceSchema.table('agent_tool_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  turnId: uuid('turn_id').notNull().references((): AnyPgColumn => agentTurns.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  toolName: text('tool_name').notNull(),
  toolCategory: text('tool_category').notNull().default('UNKNOWN'),
  startedAt: timestamp('started_at', tz).notNull(),
  completedAt: timestamp('completed_at', tz).notNull(),
  durationMs: integer('duration_ms').notNull(),
  status: text('status').notNull(),
  errorCode: text('error_code'),
  errorCategory: text('error_category'),
  traceId: text('trace_id'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
}, (t) => [
  index('agent_tool_calls_turn_idx').on(t.turnId),
  index('agent_tool_calls_tool_idx').on(t.toolName, t.createdAt),
  index('agent_tool_calls_status_idx').on(t.status, t.createdAt),
  check('agent_tool_calls_status_chk', sql`${t.status} IN ('SUCCESS','ERROR','DENIED','REPLAY')`),
  check('agent_tool_calls_category_chk', sql`${t.toolCategory} IN ('READ','WRITE','UNKNOWN')`),
]);

// Appels LLM d'un tour : permet « quel provider est lent / en fallback ». Jamais le prompt ni la réponse.
export const agentLlmCalls = intelligenceSchema.table('agent_llm_calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  turnId: uuid('turn_id').notNull().references((): AnyPgColumn => agentTurns.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  kind: text('kind').notNull(),
  provider: text('provider'),
  model: text('model'),
  durationMs: integer('duration_ms').notNull(),
  status: text('status').notNull(),
  isFallback: boolean('is_fallback').notNull().default(false),
  fallbackFrom: text('fallback_from'),
  errorCategory: text('error_category'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
}, (t) => [
  index('agent_llm_calls_turn_idx').on(t.turnId),
  index('agent_llm_calls_provider_idx').on(t.provider, t.createdAt),
  check('agent_llm_calls_kind_chk', sql`${t.kind} IN ('INTERPRETER','RESPONSE','OTHER')`),
  check('agent_llm_calls_status_chk', sql`${t.status} IN ('SUCCESS','ERROR')`),
]);
