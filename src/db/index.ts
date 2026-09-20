import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';
import { resolveDbConfig, redactSecrets } from './config';

type PostgresClient = ReturnType<typeof postgres>;

interface DbGlobals {
  client?: PostgresClient;
  authClient?: PostgresClient;
  counters: { connectionsClosed: number };
  logged?: boolean;
}

// UN seul jeu de pools par process, quel que soit le nombre de fois où ce module est évalué :
// Next/webpack peut dupliquer un module entre bundles de routes ; sans globalThis (y compris en production),
// chaque copie ouvrirait son propre pool et le budget de connexions serait multiplié silencieusement.
const g = globalThis as unknown as { __ladini_db__?: DbGlobals };
const state: DbGlobals = (g.__ladini_db__ ??= { counters: { connectionsClosed: 0 } });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const dbConfig = resolveDbConfig(process.env);

// ── SSL ───────────────────────────────────────────────────────────────────
const sslOptions: { ssl?: postgres.Options<Record<string, never>>['ssl'] } = {};
const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;
const isProduction = process.env.NODE_ENV === 'production';

// `sslmode` peut valoir require|no-verify|prefer|allow|disable|verify-full (ex: Heroku émet `no-verify`).
const sslModeMatch = connectionString.match(/[?&]sslmode=([^&]+)/i);
const sslMode = sslModeMatch ? decodeURIComponent(sslModeMatch[1]).toLowerCase() : null;

if (caPath && fs.existsSync(path.resolve(caPath))) {
  sslOptions.ssl = { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(caPath), 'utf8') };
} else if (caInline) {
  const raw = caInline.trim();
  sslOptions.ssl = { rejectUnauthorized: true, ca: raw.includes('BEGIN CERT') ? raw : Buffer.from(raw, 'base64').toString('utf8') };
} else if (
  process.env.DB_ALLOW_SELF_SIGNED === 'true' ||
  process.env.DB_ALLOW_SELF_SIGNED === '1' ||
  (sslMode && sslMode !== 'disable') ||
  connectionString.includes('supabase') || connectionString.includes('neon.tech')
) {
  sslOptions.ssl = { rejectUnauthorized: false };
} else if (!isProduction && !sslMode) {
  sslOptions.ssl = false;
}

// La query string (`sslmode`, `pgbouncer`, …) n'est pas comprise par postgres-js (elle serait relayée comme
// paramètre de session et rejetée) : on connecte sur l'URL nue. NB : `pgbouncer=true` dans l'URL n'active rien —
// l'hôte actuel est un RDS direct, pas un PgBouncer.
const bareConnectionString = connectionString.split('?')[0];

function createClient(max: number, statementTimeoutMs: number, application: string): PostgresClient {
  return postgres(bareConnectionString, {
    max,
    prepare: false,
    idle_timeout: dbConfig.idleTimeoutSec,
    connect_timeout: dbConfig.connectTimeoutSec,
    max_lifetime: dbConfig.maxLifetimeSec,
    // statement_timeout côté SERVEUR : filet de sécurité pour ne jamais monopoliser une connexion.
    // application_name permet d'identifier le site dans pg_stat_activity (partagé avec FastAPI/workers).
    connection: { statement_timeout: statementTimeoutMs, application_name: application },
    // Fermetures de connexions physiques : mesure le « churn » (chaque reconnexion SSL coûte ≈ 1,4 s).
    // Les OUVERTURES ne sont pas comptées ici : `onparameter` ne se déclenche que pour la 1re connexion
    // (postgres-js dédoublonne les paramètres partagés) — l'état réel vient de pg_stat_activity (getServerConnectionStats).
    onclose: () => { state.counters.connectionsClosed++; },
    ...sslOptions,
  });
}

// Bulkhead : le trafic auth/permissions a son propre mini-pool et un timeout strict, pour qu'une rafale
// de requêtes métier lentes ne prive jamais l'authentification de connexions (et inversement).
const client = (state.client ??= createClient(dbConfig.business.max, dbConfig.business.statementTimeoutMs, 'ladini-site'));
const authClient = (state.authClient ??= createClient(dbConfig.auth.max, dbConfig.auth.statementTimeoutMs, 'ladini-site-auth'));

if (!state.logged) {
  state.logged = true;
  // Jamais d'URL ni d'identifiants dans ce log.
  console.info(redactSecrets(JSON.stringify({
    event: 'db_pool_init', mode: dbConfig.mode, business_max: dbConfig.business.max, auth_max: dbConfig.auth.max,
    connect_timeout_s: dbConfig.connectTimeoutSec, idle_timeout_s: dbConfig.idleTimeoutSec, max_lifetime_s: dbConfig.maxLifetimeSec,
    site_instances: dbConfig.siteInstances, theoretical_site_connections: dbConfig.theoreticalSiteConnections,
  })));
}

export const db = drizzle(client, { schema });
/** Client réservé à l'authentification / aux permissions (pool séparé, timeout strict). */
export const dbAuth = drizzle(authClient, { schema });
export const dbCounters = state.counters;

/** Vue SERVEUR des connexions, par application_name (site, site-auth, et TOUS les autres clients de la base). */
export async function getServerConnectionStats() {
  const rows = (await dbAuth.execute(sql`
    select coalesce(nullif(application_name, ''), '(sans nom)') as app, coalesce(state, 'none') as state, count(*)::int as n
    from pg_stat_activity where datname = current_database() and pid <> pg_backend_pid() group by 1, 2 order by n desc
  `)) as unknown as Array<{ app: string; state: string; n: number }>;
  return rows;
}
export { schema };
export type DB = typeof db;

/**
 * Exécute `fn` dans une transaction avec un statement_timeout dédié — pour les opérations LONGUES explicites
 * (exports, agrégats), jamais pour le trafic interactif.
 */
export function withStatementTimeout<T>(ms: number, fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>): Promise<T> {
  const safeMs = Math.max(1, Math.floor(ms));
  return db.transaction(async (tx) => {
    await tx.execute(sql.raw(`SET LOCAL statement_timeout = ${safeMs}`));
    return fn(tx);
  });
}
