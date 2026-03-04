/**
 * DRIZZLE CLIENT — AgriConnect v3
 * ══════════════════════════════════════════════════════════════════════════
 * Singleton drizzle-orm client backed by `postgres` (no pooling adapter needed).
 * Zero cold-start: no code generation step, direct SQL at runtime.
 *
 * Usage:
 *   import { db } from '@/src/db';
 *   const users = await db.select().from(schema.users).where(...);
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Build connection options
const sslOptions: Record<string, unknown> = {};

// SSL support options (try multiple input methods)
try {
  // 1) DB_SSL_CA_PATH -> read PEM file from disk
  if (process.env.DB_SSL_CA_PATH) {
    const p = path.resolve(process.env.DB_SSL_CA_PATH);
    if (fs.existsSync(p)) {
      const pem = fs.readFileSync(p, 'utf8');
      sslOptions.ssl = { rejectUnauthorized: true, ca: pem };
    } else {
      console.warn('DB_SSL_CA_PATH set but file not found:', p);
    }
  }

  // 2) DB_SSL_CA -> accept either raw PEM or base64-encoded PEM
  if (!sslOptions.ssl && process.env.DB_SSL_CA) {
    const raw = process.env.DB_SSL_CA.trim();
    // Heuristic: if it contains "BEGIN CERT", assume PEM; otherwise try base64 decode
    if (raw.includes('BEGIN CERT')) {
      sslOptions.ssl = { rejectUnauthorized: true, ca: raw };
    } else {
      try {
        const caPem = Buffer.from(raw, 'base64').toString('utf8');
        if (caPem.includes('BEGIN CERT')) {
          sslOptions.ssl = { rejectUnauthorized: true, ca: caPem };
        } else {
          console.warn('DB_SSL_CA provided but decoded content not a PEM certificate');
        }
      } catch (e) {
        console.warn('DB_SSL_CA provided but failed to decode base64:', e);
      }
    }
  }

  // 3) Legacy insecure fallback
  if (!sslOptions.ssl && process.env.DB_ALLOW_SELF_SIGNED === 'true') {
    sslOptions.ssl = { rejectUnauthorized: false };
  }
} catch (e) {
  console.error('Error configuring DB SSL options:', e);
}

// Warn if TLS verification was globally disabled via NODE_TLS_REJECT_UNAUTHORIZED
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  console.warn('Warning: NODE_TLS_REJECT_UNAUTHORIZED is set to 0 — TLS certificate verification is disabled. Remove this env var and provide DB_SSL_CA or DB_SSL_CA_PATH instead.');
}

// postgres.js client — shared for the process lifetime
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  // increase connect timeout to 30s to allow cloud DB handshakes
  connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT || 30),
  ...sslOptions,
});

// Drizzle instance with full schema (relations, enums, tables)
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export { schema };
export type DB = typeof db;
