import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// 1. Singleton strict pour Next.js
// Utilisation d'un symbole ou d'une variable globale propre pour éviter tout conflit
const globalForDb = globalThis as unknown as { postgresClient: postgres.Sql<{}> };

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// 2. Configuration SSL
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

// 3. Initialisation forcée avec une limite très basse
// En prod, 'max: 5' suffit largement pour 17 slots (on garde de la marge pour les outils d'admin)
// En dev, 'max: 1' pour éviter de saturer la DB avec les rechargements du code
const maxConnections = process.env.NODE_ENV === 'production' ? 5 : 1;

const client = globalForDb.postgresClient ?? postgres(connectionString, {
  max: maxConnections, 
  prepare: false,      // Obligatoire pour PgBouncer
  idle_timeout: 10,    // Remonté à 10s : 3s est trop court, cela force une ré-ouverture constante
  connect_timeout: 10,
  ...sslOptions,
});

if (process.env.NODE_ENV !== 'production') globalForDb.postgresClient = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;