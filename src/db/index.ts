import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Singleton pour Next.js
declare global {
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error('DATABASE_URL is not set');

// Configuration SSL
const sslOptions: any = {};
const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;

if (caPath && fs.existsSync(path.resolve(caPath))) {
  sslOptions.ssl = { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(caPath), 'utf8') };
} else if (caInline) {
  const raw = caInline.trim();
  sslOptions.ssl = { rejectUnauthorized: true, ca: raw.includes('BEGIN CERT') ? raw : Buffer.from(raw, 'base64').toString('utf8') };
} else if (process.env.DB_ALLOW_SELF_SIGNED === 'true') {
  sslOptions.ssl = { rejectUnauthorized: false };
}

// Initialisation Optimisée
const client = globalThis.postgresClient ?? postgres(connectionString, {
  // Avec 17 slots, on met 10 en production pour garder 7 slots pour les outils d'admin/migration/IA
  max: process.env.NODE_ENV === 'production' ? 10 : 2, 
  
  // Désactivé pour PgBouncer / DigitalOcean
  prepare: false, 
  
  // RÈGLE D'OR : On coupe à 3 secondes. 
  // Si la requête est terminée, on ne garde pas le slot inutilement.
  idle_timeout: 3, 
  
  // Connexion rapide
  connect_timeout: 5,

  // Déconnexion propre des workers inactifs
  onclose: () => {},
  
  ...sslOptions,
});

if (process.env.NODE_ENV !== 'production') globalThis.postgresClient = client;

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;