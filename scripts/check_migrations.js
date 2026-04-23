const { Client } = require('pg');

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const checks = [
    { sql: "SELECT to_regclass('marketplace.seed_allocations') IS NOT NULL AS exists", name: 'marketplace.seed_allocations' },
    { sql: "SELECT to_regclass('marketplace.seed_distributions') IS NOT NULL AS exists", name: 'marketplace.seed_distributions' },
    { sql: "SELECT to_regclass('auth.daily_advice_logs') IS NOT NULL AS exists", name: 'auth.daily_advice_logs' },
    { sql: "SELECT to_regclass('auth.user_cultures') IS NOT NULL AS exists", name: 'auth.user_cultures' },
    { sql: "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='whatsapp_enabled') AS exists", name: 'auth.users.whatsapp_enabled' },
  ];

  for (const c of checks) {
    try {
      const res = await client.query(c.sql);
      console.log(c.name + ':', res.rows[0].exists);
    } catch (err) {
      console.log(c.name + ': error -', err.message);
    }
  }

  await client.end();
}

check().catch((e) => { console.error(e); process.exit(1); });
