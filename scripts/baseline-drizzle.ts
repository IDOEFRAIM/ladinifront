import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/src/db';

const MIGRATION_DIR = path.resolve(process.cwd(), 'drizzle');
const JOURNAL_FILE = path.resolve(MIGRATION_DIR, 'meta', '_journal.json');
const MIGRATION_TABLE = '__drizzle_migrations';
const MIGRATION_SCHEMA = 'public';

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

function readJournal(): Journal {
  if (!fs.existsSync(JOURNAL_FILE)) {
    throw new Error(`Journal file not found: ${JOURNAL_FILE}`);
  }
  return JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf-8'));
}

function sha256OfFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function ensureMigrationsTable() {
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(MIGRATION_SCHEMA)};`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(MIGRATION_SCHEMA)}.${sql.identifier(MIGRATION_TABLE)} (
      id serial PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint NOT NULL
    );
  `);
}

async function main() {
  const journal = readJournal();
  const baselineEntry = journal.entries.find((e) => e.idx === 0);

  if (!baselineEntry) {
    throw new Error('No migration with idx 0 found in journal.');
  }

  const migrationFile = path.resolve(MIGRATION_DIR, `${baselineEntry.tag}.sql`);
  if (!fs.existsSync(migrationFile)) {
    throw new Error(`Migration file not found: ${migrationFile}`);
  }

  const hash = sha256OfFile(migrationFile);
  const createdAt = BigInt(baselineEntry.when);

  console.log(`Baseline migration: ${baselineEntry.tag}.sql`);
  console.log(`  hash: ${hash}`);
  console.log(`  created_at (from journal): ${createdAt}`);

  await ensureMigrationsTable();

  const existing = await db.execute(
    sql`SELECT 1 as found FROM ${sql.identifier(MIGRATION_SCHEMA)}.${sql.identifier(MIGRATION_TABLE)} WHERE hash = ${hash} LIMIT 1;`
  ) as any;

  if (existing && existing.length > 0 && existing[0]?.found) {
    console.log('Baseline migration is already registered. Nothing to do.');
    return;
  }

  await db.execute(
    sql`INSERT INTO ${sql.identifier(MIGRATION_SCHEMA)}.${sql.identifier(MIGRATION_TABLE)} (hash, created_at) VALUES (${hash}, ${createdAt});`
  );

  console.log(`Baseline migration registered in ${MIGRATION_SCHEMA}.${MIGRATION_TABLE}.`);
  console.log('WARNING: this script did NOT execute the SQL; it only told Drizzle the migration is already applied.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Baseline failed:', err);
    process.exit(1);
  });
