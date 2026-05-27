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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Configuration SSL robuste
const sslOptions: Partial<postgres.Options<any>> = {};
const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;

if (caPath && fs.existsSync(path.resolve(caPath))) {
  sslOptions.ssl = { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(caPath), 'utf8') };
} else if (caInline) {
  const raw = caInline.trim();
  sslOptions.ssl = { rejectUnauthorized: true, ca: raw.includes('BEGIN CERT') ? raw : Buffer.from(raw, 'base64').toString('utf8') };
} else if (process.env.DB_ALLOW_SELF_SIGNED === 'true' || process.env.DB_ALLOW_SELF_SIGNED === '1') {
  sslOptions.ssl = { rejectUnauthorized: false };
}

const isVercel = !!process.env.VERCEL;
const poolMax = parseInt(process.env.DB_POOL_MAX || '', 10) || (isVercel ? 5 : 10);

const client: PostgresClient =
  globalThis.__frontag_postgres_client__ ??
  postgres(connectionString, {
    max: poolMax,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: isVercel ? 60 : 300,
    ...sslOptions,
  });

// En développement, on attache le client au scope global pour le Hot Reload
if (process.env.NODE_ENV !== 'production') {
  globalThis.__frontag_postgres_client__ = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;