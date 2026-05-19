import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// 1. Singleton Pattern pour Next.js (Évite de recréer des clients au Hot Reload)
declare global {
  // eslint-disable-next-line no-var
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 2. Configuration SSL Optimisée
const sslOptions: any = {};
try {
  const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
  const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;

  if (caPath && fs.existsSync(path.resolve(caPath))) {
    const pem = fs.readFileSync(path.resolve(caPath), 'utf8');
    sslOptions.ssl = { rejectUnauthorized: true, ca: pem };
  } else if (caInline) {
    const raw = caInline.trim();
    const caPem = raw.includes('BEGIN CERT') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    sslOptions.ssl = { rejectUnauthorized: true, ca: caPem };
  } else if (process.env.DB_ALLOW_SELF_SIGNED === 'true' || process.env.DB_ALLOW_SELF_SIGNED === '1') {
    sslOptions.ssl = { rejectUnauthorized: false };
  }
} catch (e) {
  console.error('SSL Configuration Error:', e);
}

// 3. Initialisation du Driver Postgres (Paramètres Critiques)
// On bride volontairement à 'max: 2' pour laisser de la place à ton Agent IA
const client = globalThis.postgresClient ?? postgres(connectionString, {
  // --- CONFIGURATION ANTI-SATURATION ---
  max: process.env.NODE_ENV === 'production' ? 4 : 2, 
  
  // Obligatoire pour DigitalOcean (port 25061) et PgBouncer
  prepare: false, 
  
  // Libère le slot de connexion après 5 secondes d'inactivité
  idle_timeout: 5, 
  
  // Temps max pour établir la connexion (en secondes)
  connect_timeout: 10,

  // Ignore les erreurs de types non critiques pour éviter les crashs de rendu
  onnotice: () => {}, 
  
  ...sslOptions,
});

// Attachement au scope global en développement
if (process.env.NODE_ENV !== 'production') {
  globalThis.postgresClient = client;
}

// 4. Instance Drizzle
export const db = drizzle(client, { schema });

// Re-exports
export { schema };
export type DB = typeof db;