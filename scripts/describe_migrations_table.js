const { Client } = require('pg');
require('dotenv/config');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in environment.');
  process.exit(2);
}

const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : true;
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized } });

(async () => {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
      ORDER BY ordinal_position
    `);
    if (res.rows.length === 0) {
      console.log('Table drizzle.__drizzle_migrations does not exist or has no columns.');
    } else {
      console.log('drizzle.__drizzle_migrations columns:');
      console.table(res.rows);
    }
  } catch (err) {
    console.error('Error describing migrations table:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
