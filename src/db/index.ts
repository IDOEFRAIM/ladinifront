/**
 * DRIZZLE CLIENT — AgriConnect v3 (CORRIGÉ)
 * ══════════════════════════════════════════════════════════════════════════
 * Singleton drizzle-orm client backed by `postgres`.
 * Empêche la saturation des connexions en mode développement.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// 1. Définition du type pour le scope global (évite les erreurs TypeScript)
declare global {
  // eslint-disable-next-line no-var
  var postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 2. Construction des options SSL (Ta logique originale conservée)
const sslOptions: any = {};

try {
  // DB_SSL_CA_PATH -> lecture du fichier PEM
  const caPath = process.env.DB_SSL_CA_PATH || process.env.DATABASE_SSL_CA_PATH;
  if (caPath) {
    const p = path.resolve(caPath);
    if (fs.existsSync(p)) {
      const pem = fs.readFileSync(p, 'utf8');
      sslOptions.ssl = { rejectUnauthorized: true, ca: pem };
    }
  }

  // DB_SSL_CA -> certificat en ligne (PEM ou Base64)
  const caInline = process.env.DB_SSL_CA || process.env.DATABASE_SSL_CA;
  if (!sslOptions.ssl && caInline) {
    const raw = caInline.trim();
    if (raw.includes('BEGIN CERT')) {
      sslOptions.ssl = { rejectUnauthorized: true, ca: raw };
    } else {
      try {
        const caPem = Buffer.from(raw, 'base64').toString('utf8');
        if (caPem.includes('BEGIN CERT')) {
          sslOptions.ssl = { rejectUnauthorized: true, ca: caPem };
        }
      } catch (e) {
        console.warn('DB_SSL_CA: échec du décodage base64');
      }
    }
  }

  // Fallback auto-signé
  const allowSelfSigned =
    process.env.DB_ALLOW_SELF_SIGNED === '1' ||
    String(process.env.DB_ALLOW_SELF_SIGNED).toLowerCase() === 'true';
  if (!sslOptions.ssl && allowSelfSigned) {
    sslOptions.ssl = { rejectUnauthorized: false };
  }
} catch (e) {
  console.error('Error configuring DB SSL options:', e);
}

// 3. Initialisation du Singleton Postgres
// On vérifie si un client existe déjà dans globalThis pour éviter d'en créer un nouveau au Hot Reload
const client = globalThis.postgresClient ?? postgres(connectionString, {
  max: 10, // Limite le pool de connexions
  idle_timeout: 20, // Ferme les connexions inactives
  connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 30),
  ...sslOptions,
});

// En développement, on attache le client à globalThis
if (process.env.NODE_ENV !== 'production') {
  globalThis.postgresClient = client;
}

// 4. Instance Drizzle
export const db = drizzle(client, { schema });

// Re-exports
export { schema };
export type DB = typeof db;