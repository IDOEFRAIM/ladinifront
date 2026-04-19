const { Client } = require('pg');
(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    const res = await client.query(`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('intelligence','marketplace','governance','drizzle') ORDER BY table_schema, table_name;`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
