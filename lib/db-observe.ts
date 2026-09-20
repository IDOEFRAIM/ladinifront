/**
 * Observabilité + budgets de temps + retry borné pour les accès DB critiques.
 *
 * `dbOp(name, options, fn)` :
 *  - borne le temps d'attente côté site (acquisition pool + exécution) → jamais 30 s de blocage silencieux ;
 *  - classe l'erreur (lib/db-errors) ; ne rejoue QUE les lectures sur erreur de connexion, 1 fois ;
 *  - n'effectue AUCUN retry d'écriture, sauf `idempotent: true` explicite ;
 *  - émet un log JSON structuré (jamais d'URL, de SQL avec paramètres ou d'identifiants) et alimente les compteurs.
 *
 * Limite assumée : postgres-js n'expose pas l'acquisition du pool. `duration_ms` = acquisition + exécution.
 * La décomposition DNS / TCP / TLS / requête est mesurée par `npm run db:diagnose` (scripts/db-diagnose.mjs).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { dbConfig, dbCounters } from '@/src/db';
import { classifyDbError, DbOpTimeoutError, DbQueueFullError, type DbErrorClass } from '@/lib/db-errors';
import { redactSecrets } from '@/src/db/config';

export type DbCategory = 'auth' | 'interactive' | 'background';

export interface DbOpOptions {
  category: DbCategory;
  /** `write` : jamais rejoué automatiquement (sauf `idempotent`). Défaut : `read`. */
  kind?: 'read' | 'write';
  idempotent?: boolean;
  /** Surcharge explicite du budget d'appel (opérations longues assumées). */
  timeoutMs?: number;
}

// ── request id ────────────────────────────────────────────────────────────
const requestContext = new AsyncLocalStorage<{ requestId: string }>();
export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  return requestContext.run({ requestId }, fn);
}
export const currentRequestId = (): string => requestContext.getStore()?.requestId ?? 'none';

// ── compteurs (par process) ───────────────────────────────────────────────
const g = globalThis as unknown as { __ladini_db_metrics__?: Metrics };
interface Metrics {
  inflight: { auth: number; business: number };
  queryTimeouts: number;
  connectionErrors: number;
  retries: number;
  errorsByClass: Partial<Record<DbErrorClass, number>>;
  samples: Map<string, number[]>;
}
const metrics: Metrics = (g.__ladini_db_metrics__ ??= {
  inflight: { auth: 0, business: 0 }, queryTimeouts: 0, connectionErrors: 0, retries: 0, errorsByClass: {}, samples: new Map(),
});
const SAMPLE_MAX = 200;
const SLOW_LOG_MS = 1000;

function pct(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;
}

/** Instantané des métriques — exposé par /api/admin/db-metrics (admin uniquement). */
export function getDbMetrics() {
  const active = metrics.inflight.auth + metrics.inflight.business;
  const capacity = dbConfig.business.max + dbConfig.auth.max;
  const operations: Record<string, { count: number; p50: number; p95: number; p99: number }> = {};
  for (const [name, values] of metrics.samples) {
    const sorted = [...values].sort((a, b) => a - b);
    operations[name] = { count: sorted.length, p50: pct(sorted, 50), p95: pct(sorted, 95), p99: pct(sorted, 99) };
  }
  return {
    db_pool_active: Math.min(active, capacity),
    // Estimation : appels en vol au-delà de la capacité des pools = appels en file d'attente d'une connexion.
    db_pool_waiting: Math.max(0, metrics.inflight.business - dbConfig.business.max) + Math.max(0, metrics.inflight.auth - dbConfig.auth.max),
    // Churn de connexions (chaque fermeture ⇒ une future reconnexion SSL ≈ 1,4 s). Ouvertes/idle : voir `server_connections`.
    db_connections_closed_total: dbCounters.connectionsClosed,
    db_query_timeout_total: metrics.queryTimeouts,
    db_connection_error_total: metrics.connectionErrors,
    db_retry_total: metrics.retries,
    db_errors_by_class: metrics.errorsByClass,
    db_query_duration_ms: operations,
    config: { mode: dbConfig.mode, business_max: dbConfig.business.max, auth_max: dbConfig.auth.max, theoretical_site_connections: dbConfig.theoreticalSiteConnections },
  };
}

/** Réservé aux tests. */
export function resetDbMetrics() {
  metrics.inflight = { auth: 0, business: 0 };
  metrics.queryTimeouts = 0; metrics.connectionErrors = 0; metrics.retries = 0;
  metrics.errorsByClass = {}; metrics.samples.clear();
}

function record(name: string, ms: number) {
  const list = metrics.samples.get(name) ?? [];
  list.push(ms);
  if (list.length > SAMPLE_MAX) list.shift();
  metrics.samples.set(name, list);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withBudget<T>(name: string, budgetMs: number, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      // La requête continue côté serveur jusqu'à statement_timeout : on libère seulement l'appelant.
      promise.catch(() => undefined);
      reject(new DbOpTimeoutError(name, budgetMs));
    }, budgetMs);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function dbOp<T>(operation: string, options: DbOpOptions, fn: () => Promise<T>): Promise<T> {
  const pool = options.category === 'auth' ? 'auth' : 'business';
  const budget = options.timeoutMs ?? (options.category === 'auth' ? dbConfig.auth.opTimeoutMs : dbConfig.business.opTimeoutMs);
  const mayRetry = (options.kind ?? 'read') === 'read' || options.idempotent === true;
  const startedAt = Date.now();
  let attempts = 0;

  // Délestage : débit du pool ≈ connexions ÷ latence réseau ; au-delà de la file tolérée, attendre ne fait qu'allonger
  // la latence de tout le monde. On refuse vite (503 + Retry-After) — c'est une surcharge, pas un timeout.
  const capacity = pool === 'auth' ? dbConfig.auth.max : dbConfig.business.max;
  const queueLimit = capacity * dbConfig.queueFactor;
  if (metrics.inflight[pool] >= queueLimit) {
    const err = new DbQueueFullError(operation, queueLimit);
    metrics.errorsByClass.overload = (metrics.errorsByClass.overload ?? 0) + 1;
    log({ operation, category: options.category, duration: 0, success: false, attempts: 0, errorClass: 'overload', errorCode: err.code });
    throw err;
  }
  let lastError: unknown;

  for (;;) {
    attempts++;
    metrics.inflight[pool]++;
    try {
      const result = await withBudget(operation, budget, fn());
      const duration = Date.now() - startedAt;
      record(operation, duration);
      if (duration >= SLOW_LOG_MS || process.env.DB_LOG_ALL === '1') {
        log({ operation, category: options.category, duration, success: true, attempts });
      }
      return result;
    } catch (err) {
      lastError = err;
      const info = classifyDbError(err);
      metrics.errorsByClass[info.errorClass] = (metrics.errorsByClass[info.errorClass] ?? 0) + 1;
      if (info.errorClass === 'statement_timeout' || info.errorClass === 'op_timeout') metrics.queryTimeouts++;
      if (info.errorClass === 'connection') metrics.connectionErrors++;

      // Un seul retry, uniquement erreur de connexion, uniquement lecture/idempotent, et seulement s'il reste du budget.
      const remaining = budget - (Date.now() - startedAt);
      if (attempts === 1 && info.retryable && mayRetry && remaining > 1000) {
        metrics.retries++;
        log({ operation, category: options.category, duration: Date.now() - startedAt, success: false, attempts, errorClass: info.errorClass, errorCode: info.code, retrying: true });
        await sleep(150 + Math.floor(Math.random() * 150));
        continue;
      }
      log({ operation, category: options.category, duration: Date.now() - startedAt, success: false, attempts, errorClass: info.errorClass, errorCode: info.code });
      throw lastError;
    } finally {
      metrics.inflight[pool]--;
    }
  }
}

function log(entry: {
  operation: string; category: DbCategory; duration: number; success: boolean; attempts: number;
  errorClass?: DbErrorClass; errorCode?: string; retrying?: boolean;
}) {
  const line = redactSecrets(JSON.stringify({
    event: 'db_op',
    operation_name: entry.operation,
    category: entry.category,
    duration_ms: entry.duration,
    success: entry.success,
    attempts: entry.attempts,
    error_class: entry.errorClass,
    error_code: entry.errorCode,
    retrying: entry.retrying,
    request_id: currentRequestId(),
  }));
  if (entry.success) console.info(line);
  else console.warn(line);
}
