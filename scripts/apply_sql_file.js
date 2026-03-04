#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

async function main() {
  const fileArg = process.argv[2] || '.drizzle_push.log';
  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('SQL log file not found:', filePath);
    process.exit(1);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  // Remove common ANSI escape sequences and control chars that break parsing
  content = content.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
  content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Extract SQL starting from first CREATE TABLE up to first DROP SCHEMA
  const startIdx = content.indexOf('CREATE TABLE');
  if (startIdx === -1) {
    console.error('No CREATE TABLE found in log.');
    process.exit(1);
  }
  // find first DROP SCHEMA after the CREATEs
  const dropIdx = content.indexOf('\nDROP SCHEMA', startIdx);
  const sqlToRun = (dropIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, dropIdx)).trim();
  if (!sqlToRun) {
    console.error('No SQL found to apply after stripping DROP SCHEMA lines.');
    process.exit(1);
  }

  console.log('Connecting to DB and applying SQL chunk...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in environment.');
    process.exit(1);
  }

  const ssl = {};
  if (process.env.DB_ALLOW_SELF_SIGNED === '1' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    // allow self-signed (insecure) if explicitly configured
    ssl.rejectUnauthorized = false;
  }

  const sql = postgres(connectionString, { ssl });
  try {
    // Run as a single batch; many statements are present
    await sql.unsafe(sqlToRun);
    console.log('SQL applied successfully.');
  } catch (err) {
    console.error('Error applying SQL:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
