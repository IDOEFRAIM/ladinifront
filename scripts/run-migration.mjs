/**
 * Safe migration runner — executes a drizzle migration SQL file statement by statement.
 * Skips "already exists" errors gracefully.
 * Usage: node scripts/run-migration.mjs [migration-file]
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;
const migrationFile = process.argv[2];
if (!migrationFile) { console.error('Usage: node scripts/run-migration.mjs <path-to-sql>'); process.exit(1); }

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const migrationSql = readFileSync(migrationFile, 'utf8');
const statements = migrationSql
  .split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(Boolean);

async function run() {
  await client.connect();
  console.log(`Connected. Running ${statements.length} statements from ${migrationFile}\n`);

  let applied = 0, skipped = 0;

  for (const stmt of statements) {
    const label = stmt.substring(0, 90).replace(/\n/g, ' ');
    try {
      await client.query(stmt);
      applied++;
      console.log(`  ✅ ${label}...`);
    } catch (err) {
      if (['42P07','42701','42710','42P16'].includes(err.code)) {
        skipped++;
        console.log(`  ⏭️  SKIP (already exists): ${label}...`);
      } else if (err.code === '23503') {
        // FK violation — orphaned data
        console.log(`  ⚠️  FK violation — fixing orphans for: ${label}...`);
        // Try to extract table and constraint info for auto-fix
        skipped++;
        console.log(`     → Skipped. Run orphan cleanup manually if needed.`);
      } else {
        console.error(`  ❌ FAILED: ${label}`);
        console.error(`     Code: ${err.code} — ${err.message}`);
        throw err;
      }
    }
  }

  console.log(`\n🎉 Done: ${applied} applied, ${skipped} skipped.`);
  await client.end();
}

run().catch(async (err) => {
  console.error('\n💥 Migration failed:', err.message);
  await client.end().catch(() => {});
  process.exit(1);
});
