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

//: Catalogue (backend `domain/analytics/business_events.py::BusinessEventName`)
// — mêmes noms, mêmes deux dépôts synchronisés. Ajouter un event = ajouter
// ici ET dans le fichier Python, dans le MÊME commit.
const EVENT_NAMES = [
  'DIRECT_SEARCH_PERFORMED', 'DIRECT_SEARCH_SUCCEEDED', 'DIRECT_ORDER_CREATED',
  'DIRECT_ORDER_CONFIRMED', 'DIRECT_ORDER_DELIVERED', 'DIRECT_ORDER_FAILED',
  'TENDER_CREATED', 'TENDER_PUBLISHED', 'TENDER_BID_RECEIVED', 'TENDER_WINNER_SELECTED',
  'TENDER_ORDER_CREATED', 'TENDER_DELIVERED',
  'RECURRING_NEED_CREATED', 'RECURRING_OCCURRENCE_CREATED', 'RECURRING_MATCH_FOUND',
  'RECURRING_DIGEST_SENT', 'RECURRING_DIGEST_ACCEPTED', 'RECURRING_DIGEST_MODIFIED',
  'RECURRING_OCCURRENCE_SKIPPED', 'RECURRING_OCCURRENCE_CONFIRMED', 'RECURRING_OCCURRENCE_DELIVERED',
  // SUPPLY (Producer Analytics Phase B)
  'PRODUCT_PUBLISHED_FOR_SALE', 'PRODUCT_SELLABLE_QUANTITY_CHANGED',
] as const;
//: journey CHECK values — widened in Phase B (migration 0008) to add SUPPLY,
// the producer-supply axis (a quantity/visibility change on a Product isn't
// tied to any one buyer journey). Kept as one constant so both CHECKs below
// can never drift apart.
const JOURNEY_VALUES_SQL = sql.raw("'DIRECT','TENDER','RECURRING','SUPPLY'");
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
  check('event_outbox_journey_chk', sql`${t.journey} IN (${JOURNEY_VALUES_SQL})`),
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
  check('business_events_journey_chk', sql`${t.journey} IN (${JOURNEY_VALUES_SQL})`),
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

// ─────────────────────────────────────────────────────────────────────────────
// PHASE D — agrégats quotidiens (2026-09-27)
//
// Règles communes (voir backend `docs/analytics/METRIC_LAYER.md`) :
// - on stocke des NUMÉRATEURS / DÉNOMINATEURS (comptes, quantités, montants),
//   JAMAIS des taux : un taux ne se recompose que par SUM(num)/SUM(den).
// - grain = (metric_date [+ dimensions]) ; les dimensions absentes/inconnues
//   valent le UUID nul (`00000000-…`) plutôt que NULL, pour qu'un index UNIQUE
//   garantisse réellement "une ligne par grain" (NULL est distinct en unique).
//   Ce UUID nul signifie "non renseigné / non attribuable" (ex. commande
//   multi-sous-catégories) ; il n'a volontairement AUCUNE FK.
// - `metric_date` = jour UTC d'une COHORTE : commandes/appels d'offres à leur
//   date de création, occurrences récurrentes à leur date de besoin. Une
//   livraison tardive modifie donc la ligne de la cohorte d'origine
//   (recalcul idempotent DELETE+INSERT du jour), sans jamais bouger la ligne
//   du jour de livraison.
// - table dérivée et reconstructible : aucune FK, aucune donnée saisie.
// ─────────────────────────────────────────────────────────────────────────────

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const qty = (name: string) => numeric(name, { precision: 16, scale: 3 }).notNull().default('0');
const money = (name: string) => numeric(name, { precision: 16, scale: 2 }).notNull().default('0');
const count = (name: string) => integer(name).notNull().default(0);

/** Grain : (jour, acheteur). COUNT(DISTINCT buyer_id) sur une fenêtre reste exact. */
export const buyerDailyMetrics = analyticsSchema.table('buyer_daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricDate: date('metric_date').notNull(),
  buyerId: uuid('buyer_id').notNull(),
  zoneId: uuid('zone_id').notNull().default(NIL_UUID),

  needsDirect: count('needs_direct'),
  needsTender: count('needs_tender'),
  needsRecurring: count('needs_recurring'),
  satisfiedDirect: count('satisfied_direct'),
  satisfiedTender: count('satisfied_tender'),
  satisfiedRecurring: count('satisfied_recurring'),

  potentialGmvDirect: money('potential_gmv_direct'),
  potentialGmvTender: money('potential_gmv_tender'),
  potentialGmvRecurring: money('potential_gmv_recurring'),
  // D.5 : DIRECT confirmé = Order.status CONFIRMED (acceptation producteur / paiement escrow), event DIRECT_ORDER_CONFIRMED.
  confirmedGmvDirect: money('confirmed_gmv_direct'),
  confirmedGmvTender: money('confirmed_gmv_tender'),
  confirmedGmvRecurring: money('confirmed_gmv_recurring'),
  deliveredGmvDirect: money('delivered_gmv_direct'),
  deliveredGmvTender: money('delivered_gmv_tender'),
  deliveredGmvRecurring: money('delivered_gmv_recurring'),

  // Base "temps d'événement" (jour d'occurrence de l'event), pas cohorte.
  digestsQueued: count('digests_queued'),
  digestsAccepted: count('digests_accepted'),

  computedAt: timestamp('computed_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('buyer_daily_metrics_grain_uq').on(t.metricDate, t.buyerId),
  index('buyer_daily_metrics_date_zone_idx').on(t.metricDate, t.zoneId),
  check('buyer_daily_metrics_counts_chk', sql`${t.needsDirect} >= 0 AND ${t.needsTender} >= 0 AND ${t.needsRecurring} >= 0 AND ${t.satisfiedDirect} >= 0 AND ${t.satisfiedTender} >= 0 AND ${t.satisfiedRecurring} >= 0 AND ${t.digestsQueued} >= 0 AND ${t.digestsAccepted} >= 0`),
  check('buyer_daily_metrics_confirmed_direct_chk', sql`${t.confirmedGmvDirect} >= 0`),
  check('buyer_daily_metrics_money_chk', sql`${t.potentialGmvDirect} >= 0 AND ${t.potentialGmvTender} >= 0 AND ${t.potentialGmvRecurring} >= 0 AND ${t.confirmedGmvTender} >= 0 AND ${t.confirmedGmvRecurring} >= 0 AND ${t.deliveredGmvDirect} >= 0 AND ${t.deliveredGmvTender} >= 0 AND ${t.deliveredGmvRecurring} >= 0`),
]);

/** Grain : (jour de création, zone, catégorie, sous-catégorie). Pas de dimension d'unité : aucune quantité physique ici. */
export const directDailyMetrics = analyticsSchema.table('direct_daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricDate: date('metric_date').notNull(),
  zoneId: uuid('zone_id').notNull().default(NIL_UUID),
  categoryId: uuid('category_id').notNull().default(NIL_UUID),
  subCategoryId: uuid('sub_category_id').notNull().default(NIL_UUID),

  // Source : business_events (seule source des recherches ; historique inexistant avant Phase C).
  searches: count('searches'),
  successfulSearches: count('successful_searches'),
  // Source : marketplace.orders (cohorte par created_at, hors DRAFT/SUPERSEDED, hors appel d'offres).
  ordersCreated: count('orders_created'),
  ordersDelivered: count('orders_delivered'),
  // D.5 : commandes ayant atteint l'engagement ferme (CONFIRMED) ; un livré est toujours compté confirmé.
  ordersConfirmed: count('orders_confirmed'),
  confirmedValue: money('confirmed_value'),
  createdValue: money('created_value'),
  deliveredValue: money('delivered_value'),

  computedAt: timestamp('computed_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('direct_daily_metrics_grain_uq').on(t.metricDate, t.zoneId, t.categoryId, t.subCategoryId),
  index('direct_daily_metrics_date_idx').on(t.metricDate),
  check('direct_daily_metrics_confirmed_chk', sql`${t.ordersConfirmed} >= 0 AND ${t.confirmedValue} >= 0`),
  check('direct_daily_metrics_counts_chk', sql`${t.searches} >= 0 AND ${t.successfulSearches} >= 0 AND ${t.ordersCreated} >= 0 AND ${t.ordersDelivered} >= 0 AND ${t.createdValue} >= 0 AND ${t.deliveredValue} >= 0`),
]);

/** Grain : (jour de création de l'appel d'offres, zone cible, catégorie, sous-catégorie). */
export const tenderDailyMetrics = analyticsSchema.table('tender_daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricDate: date('metric_date').notNull(),
  zoneId: uuid('zone_id').notNull().default(NIL_UUID),
  categoryId: uuid('category_id').notNull().default(NIL_UUID),
  subCategoryId: uuid('sub_category_id').notNull().default(NIL_UUID),

  tendersCreated: count('tenders_created'),
  tendersWithBid: count('tenders_with_bid'),
  bidsReceived: count('bids_received'),
  tendersWithWinner: count('tenders_with_winner'),
  tenderOrdersCreated: count('tender_orders_created'),
  tenderOrdersDelivered: count('tender_orders_delivered'),
  // Somme des délais (secondes) + nombre d'appels d'offres mesurés : la moyenne = somme / nombre, jamais moyenne de moyennes.
  firstBidLatencySecondsSum: numeric('first_bid_latency_seconds_sum', { precision: 18, scale: 3 }).notNull().default('0'),
  firstBidLatencyCount: count('first_bid_latency_count'),
  potentialValue: money('potential_value'),
  committedValue: money('committed_value'),
  deliveredValue: money('delivered_value'),

  computedAt: timestamp('computed_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('tender_daily_metrics_grain_uq').on(t.metricDate, t.zoneId, t.categoryId, t.subCategoryId),
  index('tender_daily_metrics_date_idx').on(t.metricDate),
  check('tender_daily_metrics_counts_chk', sql`${t.tendersCreated} >= 0 AND ${t.tendersWithBid} >= 0 AND ${t.bidsReceived} >= 0 AND ${t.tendersWithWinner} >= 0 AND ${t.tenderOrdersCreated} >= 0 AND ${t.tenderOrdersDelivered} >= 0 AND ${t.firstBidLatencySecondsSum} >= 0 AND ${t.firstBidLatencyCount} >= 0 AND ${t.potentialValue} >= 0 AND ${t.committedValue} >= 0 AND ${t.deliveredValue} >= 0`),
]);

/**
 * Grain : (jour du besoin, zone, catégorie, sous-catégorie, unité canonique).
 * L'unité fait partie du grain : jamais de KG + L + TETE dans une même somme.
 * `canonical_unit` = priority_unit de la sous-catégorie quand l'unité de
 * l'occurrence lui est compatible (conversion G→KG…), sinon l'unité de
 * l'occurrence elle-même ; `measurement_family` en dérive.
 */
export const recurringDailyMetrics = analyticsSchema.table('recurring_daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricDate: date('metric_date').notNull(),
  zoneId: uuid('zone_id').notNull().default(NIL_UUID),
  categoryId: uuid('category_id').notNull().default(NIL_UUID),
  subCategoryId: uuid('sub_category_id').notNull().default(NIL_UUID),
  canonicalUnit: text('canonical_unit').notNull(),
  measurementFamily: text('measurement_family').notNull(),

  occurrencesTotal: count('occurrences_total'),
  // Hors SKIPPED/CANCELLED : la demande que l'acheteur maintient réellement.
  occurrencesActive: count('occurrences_active'),
  occurrencesFullyCovered: count('occurrences_fully_covered'),
  occurrencesNotified: count('occurrences_notified'),
  occurrencesAccepted: count('occurrences_accepted'),
  occurrencesSkipped: count('occurrences_skipped'),
  occurrencesWithOrders: count('occurrences_with_orders'),
  occurrencesAllReceived: count('occurrences_all_received'),
  needsWithOccurrence: count('needs_with_occurrence'),

  // Occurrences ACTIVES uniquement, en unité canonique.
  requestedQuantity: qty('requested_quantity'),
  matchedQuantity: qty('matched_quantity'),
  confirmedQuantity: qty('confirmed_quantity'),
  // D.5 : quantité des lignes de commande RECEIVED des allocations CONVERTED de l'occurrence (unité canonique).
  deliveredQuantity: qty('delivered_quantity'),
  // SUM(GREATEST(requested - matched, 0)) : DEMANDE NON APPARIÉE (matching), pas "non livrée".
  unmatchedQuantity: qty('unmatched_quantity'),
  potentialValue: money('potential_value'),
  confirmedValue: money('confirmed_value'),
  receivedValue: money('received_value'),

  computedAt: timestamp('computed_at', tz).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('recurring_daily_metrics_grain_uq').on(t.metricDate, t.zoneId, t.categoryId, t.subCategoryId, t.canonicalUnit),
  index('recurring_daily_metrics_date_idx').on(t.metricDate),
  check('recurring_daily_metrics_family_chk', sql`${t.measurementFamily} IN ('MASS','VOLUME','COUNT','PACKAGE','OTHER')`),
  check('recurring_daily_metrics_counts_chk', sql`${t.occurrencesTotal} >= 0 AND ${t.occurrencesActive} >= 0 AND ${t.occurrencesFullyCovered} >= 0 AND ${t.occurrencesNotified} >= 0 AND ${t.occurrencesAccepted} >= 0 AND ${t.occurrencesSkipped} >= 0 AND ${t.occurrencesWithOrders} >= 0 AND ${t.occurrencesAllReceived} >= 0 AND ${t.needsWithOccurrence} >= 0`),
  check('recurring_daily_metrics_delivered_chk', sql`${t.deliveredQuantity} >= 0`),
  check('recurring_daily_metrics_qty_chk', sql`${t.requestedQuantity} >= 0 AND ${t.matchedQuantity} >= 0 AND ${t.confirmedQuantity} >= 0 AND ${t.unmatchedQuantity} >= 0 AND ${t.potentialValue} >= 0 AND ${t.confirmedValue} >= 0 AND ${t.receivedValue} >= 0`),
]);
