const { Client } = require('pg');
require('dotenv/config');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set in environment.');
  process.exit(2);
}

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

  return { rejectUnauthorized, ...(ca ? { ca } : {}) };
}

const client = new Client({ connectionString: url, ssl: buildSslFromEnv() });

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
