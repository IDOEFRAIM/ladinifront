import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

type PostgresClient = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __frontag_postgres_client__: PostgresClient | undefined;
}
//dfgh 
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// ── CONFIGURATION SSL INTELLIGENTE & ROBUSTE ──────────────────────────────
const sslOptions: Partial<postgres.Options<any>> = {};
const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;

const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// `sslmode` peut valoir require|no-verify|prefer|allow|disable|verify-full — pas
// seulement "require" (ex: Heroku Postgres émet `sslmode=no-verify`). On extrait
// la valeur réelle plutôt que de ne matcher qu'un seul littéral.
const sslModeMatch = connectionString.match(/[?&]sslmode=([^&]+)/i);
const sslMode = sslModeMatch ? decodeURIComponent(sslModeMatch[1]).toLowerCase() : null;

if (caPath && fs.existsSync(path.resolve(caPath))) {
  // 1. Certificat via fichier (Production stricte)
  sslOptions.ssl = { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(caPath), 'utf8') };
} else if (caInline) {
  // 2. Certificat en ligne (Inline Base64 ou texte brut)
  const raw = caInline.trim();
  sslOptions.ssl = { rejectUnauthorized: true, ca: raw.includes('BEGIN CERT') ? raw : Buffer.from(raw, 'base64').toString('utf8') };
} else if (
  process.env.DB_ALLOW_SELF_SIGNED === 'true' ||
  process.env.DB_ALLOW_SELF_SIGNED === '1' ||
  (sslMode && sslMode !== 'disable') ||
  connectionString.includes('supabase') || connectionString.includes('neon.tech')
) {
  // 3. Auto-fallback si certificat auto-signé requis (Render, Supabase, Neon, Heroku)
  sslOptions.ssl = { rejectUnauthorized: false };
} else if (!isProduction && !sslMode) {
  // 4. En local sans SSL : On force la désactivation pour éviter les fausses alertes
  sslOptions.ssl = false;
}

// ── CONFIGURATION DU POOL DE CONNEXIONS ──────────────────────────────────
const poolMax = parseInt(process.env.DB_POOL_MAX || '', 10) || (isVercel ? 5 : 10);

// La query string (`sslmode`, `pgbouncer`, …) est un hint pour de vrais outils
// (psql, un PgBouncer en amont) — `postgres-js` la relaie telle quelle comme
// paramètres de session Postgres au driver, qui rejette tout nom qu'il ne
// reconnaît pas (`unrecognized configuration parameter "pgbouncer"`, observé
// contre Heroku Postgres). Le SSL est déjà entièrement piloté par sslOptions
// ci-dessus ; on connecte donc sur l'URL nue, comme le fait déjà le backend
// Python (`core/database.py` : `DATABASE_URL.split("?")[0]`).
const bareConnectionString = connectionString.split('?')[0];

const client: PostgresClient =
  globalThis.__frontag_postgres_client__ ??
  postgres(bareConnectionString, {
    max: poolMax,
    prepare: false, // Requis pour les architectures Serverless / PgBouncer
    idle_timeout: 20,
    connect_timeout: 10,
    timeout: 30,
    max_lifetime: isVercel ? 60 : 300,
    ...sslOptions,
  });

// En développement, on attache le client au scope global pour le Hot Reload (évite les fuites de pool)
if (!isProduction) {
  globalThis.__frontag_postgres_client__ = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;