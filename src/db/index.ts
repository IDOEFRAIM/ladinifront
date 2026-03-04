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

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Build connection options
const sslOptions: Record<string, unknown> = {};
if (process.env.DB_ALLOW_SELF_SIGNED === 'true') {
  sslOptions.ssl = { rejectUnauthorized: false };
}

// postgres.js client — shared for the process lifetime
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ...sslOptions,
});

// Drizzle instance with full schema (relations, enums, tables)
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export { schema };
export type DB = typeof db;
