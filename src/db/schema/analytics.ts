import { uuid, text, timestamp, date, numeric, integer, jsonb, index, uniqueIndex, check, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { analyticsSchema } from './_config';
import { buyerProfiles, producers } from './marketplace';
import { categories, subCategories, zones } from './governance';

/**
 * ANALYTICS — Phase C (2026-09-27). Trois tables, gouvernées comme le reste
 * du schéma (Drizzle = source de vérité, mirroir SQLAlchemy vérifié par
 * `backend/tests/schema/`) :
 *
 * - `event_outbox` : intent transactionnel, léger, écrit dans la MÊME
 *   transaction que l'action métier (même mécanisme que
 *   `intelligence.notification_outbox` — SKIP LOCKED, dedupe_key — mais une
 *   table dédiée : la forme "canal de notification" de `notification_outbox`
 *   ne convient pas à un fait typé, voir l'audit Phase A).
 * - `business_events` : le fait typé final, append-only, alimenté de façon
 *   asynchrone par le drain de `event_outbox` (Celery Beat, comme
 *   `workers/outbox/dispatcher.py`).
 * - `metric_targets` : objectifs KPI configurables par scope, AUCUNE valeur
 *   pilote n'est seedée ici (mission : "ne mets aucun objectif pilote en dur").
 *
 * `event_name`/`journey`/`actor_type`/`measurement_family`/`scope_type` sont
 * des colonnes texte + CHECK (convention du dépôt : "Use simple text columns
 * for enums to avoid creating Postgres enum types", voir `_config.ts`) —
 * jamais un vrai type ENUM Postgres, pour rester ajoutable par migration
 * EXPAND simple.
 */

const tz = { withTimezone: true } as const;

//: Catalogue Phase B (backend `domain/analytics/business_events.py::BusinessEventName`)
// — mêmes 20 noms, mêmes deux dépôts synchronisés. Ajouter un event = ajouter
// ici ET dans le fichier Python, dans le MÊME commit.
const EVENT_NAMES = [
  'DIRECT_SEARCH_PERFORMED', 'DIRECT_SEARCH_SUCCEEDED', 'DIRECT_ORDER_CREATED',
  'DIRECT_ORDER_CONFIRMED', 'DIRECT_ORDER_DELIVERED', 'DIRECT_ORDER_FAILED',
  'TENDER_CREATED', 'TENDER_PUBLISHED', 'TENDER_BID_RECEIVED', 'TENDER_WINNER_SELECTED',
  'TENDER_ORDER_CREATED', 'TENDER_DELIVERED',
  'RECURRING_NEED_CREATED', 'RECURRING_OCCURRENCE_CREATED', 'RECURRING_MATCH_FOUND',
  'RECURRING_DIGEST_SENT', 'RECURRING_DIGEST_ACCEPTED', 'RECURRING_DIGEST_MODIFIED',
  'RECURRING_OCCURRENCE_SKIPPED', 'RECURRING_OCCURRENCE_CONFIRMED', 'RECURRING_OCCURRENCE_DELIVERED',
] as const;
const EVENT_NAMES_SQL = sql.raw(EVENT_NAMES.map((n) => `'${n}'`).join(','));

export const eventOutbox = analyticsSchema.table('event_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventName: text('event_name').notNull(),
  journey: text('journey').notNull(),
  // Le payload complet (mêmes champs que business_events) — le worker de
  // drain le désérialise et INSERT dans business_events tel quel ; aucune
  // requête supplémentaire n'est nécessaire au drain (tout le calcul —
  // canonical_quantity/measurement_family/idempotency_key — est déjà fait
  // par l'émetteur AVANT l'écriture ici, jamais recalculé plus tard).
  payload: jsonb('payload').notNull(),
  dedupeKey: text('dedupe_key').notNull(),
  status: text('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  nextAttemptAt: timestamp('next_attempt_at', tz).notNull().defaultNow(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('event_outbox_dedupe_key_uq').on(t.dedupeKey),
  index('event_outbox_claim_idx').on(t.status, t.nextAttemptAt),
  check('event_outbox_status_chk', sql`${t.status} IN ('PENDING','SENDING','SENT','FAILED','DEAD')`),
  check('event_outbox_journey_chk', sql`${t.journey} IN ('DIRECT','TENDER','RECURRING')`),
]);

export const businessEvents = analyticsSchema.table('business_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  eventName: text('event_name').notNull(),
  journey: text('journey').notNull(),

  actorType: text('actor_type').notNull(),
  actorId: uuid('actor_id'),

  buyerId: uuid('buyer_id').references((): AnyPgColumn => buyerProfiles.id, { onDelete: 'set null' }),
  producerId: uuid('producer_id').references((): AnyPgColumn => producers.id, { onDelete: 'set null' }),

  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),

  categoryId: uuid('category_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  subCategoryId: uuid('sub_category_id').references((): AnyPgColumn => subCategories.id, { onDelete: 'set null' }),
  zoneId: uuid('zone_id').references((): AnyPgColumn => zones.id, { onDelete: 'set null' }),

  quantity: numeric('quantity', { precision: 14, scale: 3 }),
  unit: text('unit'),
  canonicalQuantity: numeric('canonical_quantity', { precision: 14, scale: 3 }),
  canonicalUnit: text('canonical_unit'),
  measurementFamily: text('measurement_family'),

  amount: numeric('amount', { precision: 14, scale: 2 }),
  currency: text('currency').notNull().default('XOF'),

  metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),

  occurredAt: timestamp('occurred_at', tz).notNull(),
  createdAt: timestamp('created_at', tz).notNull().defaultNow(),

  idempotencyKey: text('idempotency_key').notNull(),
}, (t) => [
  uniqueIndex('business_events_idempotency_key_uq').on(t.idempotencyKey),
  index('business_events_event_name_idx').on(t.eventName, t.occurredAt),
  index('business_events_journey_idx').on(t.journey, t.occurredAt),
  index('business_events_occurred_at_idx').on(t.occurredAt),
  index('business_events_buyer_idx').on(t.buyerId, t.occurredAt),
  index('business_events_entity_idx').on(t.entityType, t.entityId),
  index('business_events_sub_category_idx').on(t.subCategoryId, t.occurredAt),
  index('business_events_zone_idx').on(t.zoneId, t.occurredAt),
  check('business_events_event_name_chk', sql`${t.eventName} IN (${EVENT_NAMES_SQL})`),
  check('business_events_journey_chk', sql`${t.journey} IN ('DIRECT','TENDER','RECURRING')`),
  check('business_events_actor_type_chk', sql`${t.actorType} IN ('BUYER','PRODUCER','SYSTEM','ADMIN')`),
  check(
    'business_events_measurement_family_chk',
    sql`${t.measurementFamily} IS NULL OR ${t.measurementFamily} IN ('MASS','VOLUME','COUNT','PACKAGE','OTHER')`
  ),
  check('business_events_quantity_non_negative_chk', sql`${t.quantity} IS NULL OR ${t.quantity} >= 0`),
  check('business_events_amount_non_negative_chk', sql`${t.amount} IS NULL OR ${t.amount} >= 0`),
]);

export const metricTargets = analyticsSchema.table('metric_targets', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Pas de CHECK sur la liste des metric_name : le dictionnaire de métriques
  // (backend `domain/analytics/metric_dictionary.py`) est en Python, évolue
  // plus vite qu'une migration DB ne devrait suivre — validé côté
  // application (`MetricTarget.__post_init__` appelle déjà `get_metric`).
  metricName: text('metric_name').notNull(),
  scopeType: text('scope_type').notNull(),
  scopeId: uuid('scope_id'),

  targetValue: numeric('target_value', { precision: 10, scale: 4 }).notNull(),
  warningThreshold: numeric('warning_threshold', { precision: 10, scale: 4 }),
  criticalThreshold: numeric('critical_threshold', { precision: 10, scale: 4 }),

  validFrom: date('valid_from').notNull(),
  validUntil: date('valid_until'),

  createdAt: timestamp('created_at', tz).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', tz).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index('metric_targets_metric_scope_idx').on(t.metricName, t.scopeType, t.scopeId),
  check('metric_targets_scope_type_chk', sql`${t.scopeType} IN ('GLOBAL','JOURNEY','CATEGORY','SUBCATEGORY','ZONE')`),
  // Mission : GLOBAL -> scope_id NULL ; tout autre scope -> scope_id obligatoire.
  check(
    'metric_targets_scope_id_matches_scope_type_chk',
    sql`(${t.scopeType} = 'GLOBAL' AND ${t.scopeId} IS NULL) OR (${t.scopeType} <> 'GLOBAL' AND ${t.scopeId} IS NOT NULL)`
  ),
]);
