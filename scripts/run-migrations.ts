import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '@/src/db';

// Les schémas déclarés via pgSchema() (src/db/schema/_config.ts) ne sont PAS
// émis en `CREATE SCHEMA` par `drizzle-kit generate` (confirmé : absent de
// drizzle/0000_lively_triathlon.sql) — drizzle suppose qu'ils existent déjà.
// Sur une base neuve (ex: premier bootstrap Heroku), la toute première
// `CREATE TABLE "auth"."accounts"` échoue alors avec
// `schema "auth" does not exist`. On les garantit ici, avant `migrate()` :
// idempotent (`IF NOT EXISTS`) et donc inoffensif sur une base qui les a
// déjà (rien ne change côté DigitalOcean si ce script y est encore lancé).
const REQUIRED_SCHEMAS = ['auth', 'governance', 'marketplace', 'intelligence'] as const;

async function ensureRequiredSchemas() {
  for (const schemaName of REQUIRED_SCHEMAS) {
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`));
  }
}

async function main() {
  console.log('Running Drizzle migrations...');

  await ensureRequiredSchemas();

  await migrate(db, {
    migrationsFolder: './drizzle',
    migrationsTable: '__drizzle_migrations',
    migrationsSchema: 'public',
  });

  console.log('Migrations applied successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
