// scripts/check_table.js
const { Client } = require('pg');

(async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set in env');

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const res = await client.query("select to_regclass('auth.accounts') as exists");
    console.log(res.rows);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
})();
