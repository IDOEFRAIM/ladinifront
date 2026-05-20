import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Utilisation d'une variable globale typée de manière sûre pour Next.js
const globalForDb = globalThis as unknown as { 
  postgresClient: postgres.Sql<{}> | undefined 
};

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// Configuration SSL robuste
const sslOptions: any = {};
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

// CRÉATION DU CLIENT
// max: 1 est le choix le plus stable pour Vercel sans pooler. 
// Cela évite la saturation et force la file d'attente propre.
const client = globalForDb.postgresClient ?? postgres(connectionString, {
  max: 1, 
  prepare: false, 
  idle_timeout: 10,
  connect_timeout: 10,
  ...sslOptions,
});

// En développement, on attache le client au scope global pour le Hot Reload
if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;