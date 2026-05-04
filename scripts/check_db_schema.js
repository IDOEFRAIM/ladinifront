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
    } catch {
      // ignore
    }
  }

  return { rejectUnauthorized, ...(ca ? { ca } : {}) };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }

  const client = new Client({ connectionString: url, ssl: buildSslFromEnv() });
  await client.connect();

  const migrationRes = await client.query('select id, hash, created_at from drizzle.__drizzle_migrations order by id');
  console.log(`migrations_count=${migrationRes.rowCount}`);
  console.table(migrationRes.rows);

  const keyColumnsSql = `
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema='marketplace'
      and table_name in ('orders','auctions','bids','buyer_types','buyer_profiles','deliveries','delivery_agents')
      and column_name in (
        'delivery_status','auction_id','winning_bid_id',
        'auto_extend','escrow_status','linked_stock_id',
        'buyer_type_id','default_delivery_address'
      )
    order by table_name, column_name;
  `;
  const columnsRes = await client.query(keyColumnsSql);
  console.log(`key_columns_found=${columnsRes.rowCount}`);
  console.table(columnsRes.rows);

  const requiredTables = ['buyer_types', 'buyer_profiles', 'delivery_agents', 'deliveries'];
  const tablesRes = await client.query(
    `select table_name from information_schema.tables where table_schema='marketplace' and table_name = any($1::text[]) order by table_name`,
    [requiredTables]
  );
  const found = new Set(tablesRes.rows.map(r => r.table_name));
  const missing = requiredTables.filter(t => !found.has(t));
  if (missing.length) {
    console.error('Missing required marketplace tables:', missing);
    process.exitCode = 1;
  } else {
    console.log('All required marketplace tables exist.');
  }

  await client.end();
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
