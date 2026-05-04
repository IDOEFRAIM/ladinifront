const { Client } = require('pg');
require('dotenv/config');

function buildSslFromEnv() {
  const allowSelfSigned = process.env.DB_ALLOW_SELF_SIGNED === '1' || String(process.env.DB_ALLOW_SELF_SIGNED).toLowerCase() === 'true';
  const rejectUnauthorized = allowSelfSigned ? false : process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? false : true;

  let ca;
  const caInline = process.env.DATABASE_SSL_CA || process.env.DB_SSL_CA;
  const caPath = process.env.DATABASE_SSL_CA_PATH || process.env.DB_SSL_CA_PATH;
  if (caInline) {
    const raw = String(caInline).trim();
    if (raw.includes('BEGIN CERT')) ca = raw;
    else {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        if (decoded.includes('BEGIN CERT')) ca = decoded;
      } catch {}
    }
  }
  if (!ca && caPath) {
    try {
      const fs = require('fs');
      ca = fs.readFileSync(caPath, 'utf8');
    } catch (e) {
      console.warn('Could not read SSL CA path', caPath);
    }
  }

  // If no SSL env hints, let pg decide based on connection string
  if (
    !ca &&
    process.env.DATABASE_SSL_CA_PATH == null &&
    process.env.DATABASE_SSL_CA == null &&
    process.env.DB_SSL_CA_PATH == null &&
    process.env.DB_SSL_CA == null &&
    process.env.DB_ALLOW_SELF_SIGNED == null &&
    process.env.NODE_TLS_REJECT_UNAUTHORIZED == null
  ) {
    return undefined;
  }

  return { rejectUnauthorized, ...(ca ? { ca } : {}) };
}

(async () => {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const ssl = buildSslFromEnv();
  const client = new Client({ connectionString: conn, ...(ssl ? { ssl } : {}) });
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
