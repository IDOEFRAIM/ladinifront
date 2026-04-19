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
    const res = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log('auth.users columns:');
    res.rows.forEach(r => console.log(r.column_name, r.data_type));
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
