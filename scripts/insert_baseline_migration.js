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
    const ts = Date.now();
    const hash = `baseline-${ts}`;
    const res = await client.query(`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2) RETURNING id`, [hash, ts]);
    console.log('Inserted baseline migration:', { id: res.rows[0].id, hash });
  } catch (err) {
    console.error('Error inserting baseline migration:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
