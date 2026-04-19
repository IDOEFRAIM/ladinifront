const { Client } = require('pg');
require('dotenv/config');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(2);
}
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0' } });

(async () => {
  try {
    await client.connect();
    console.log('Applying ALTER TABLE statements...');
    await client.query(`ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS cnib_number text;`);
    await client.query(`ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;`);
    // try create unique index but ignore errors
    try {
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS auth_users_cnib_number_idx ON auth.users (cnib_number);`);
    } catch (e) {
      console.warn('Could not create unique index on cnib_number:', e.message);
    }
    console.log('Done.');
  } catch (err) {
    console.error('Error applying columns:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
