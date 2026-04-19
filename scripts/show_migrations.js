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
    const res = await client.query(`SELECT * FROM drizzle.__drizzle_migrations ORDER BY id`);
    if (res.rows.length === 0) {
      console.log('No drizzle migrations recorded.');
    } else {
      console.log('Drizzle migrations:');
      console.table(res.rows);
    }
  } catch (err) {
    console.error('Error querying drizzle migrations:');
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    try { await client.end(); } catch (e) {}
  }
})();
