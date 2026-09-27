// Test de charge LECTURE SEULE représentatif de /api/me : 3 lectures par clé en parallèle par « requête ».
// La charge côté serveur PG est bornée par le pool (max connexions = config auth du site) : aucune écriture.
// Usage : node scripts/db-loadtest.mjs [max_pool=3]      (à ne pas pointer vers la prod sans accord)
import fs from 'node:fs';
import postgres from 'postgres';

const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = (line ?? '').slice(13).replace(/^["']|["']$/g, '').split('?')[0];
const POOL = Number(process.argv[2] || 3);
const LEVELS = (process.env.LEVELS || '1,10,50,100').split(',').map(Number);

let opened = 0;
const sql = postgres(url, {
  ssl: { rejectUnauthorized: false }, max: POOL, prepare: false, connect_timeout: 5, idle_timeout: 120, max_lifetime: 1800,
  connection: { statement_timeout: 4000, application_name: 'ladini-loadtest' },
  onparameter: (k) => { if (k === 'server_version') opened++; },
});

const [u] = await sql`select id from auth.users limit 1`;
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];

const SHAPE = process.env.SHAPE || 'single'; // single = forme actuelle (1 requête) ; legacy = ancienne (3 requêtes parallèles)
const PER = SHAPE === 'single' ? 1 : 3;

async function meShape() {
  if (SHAPE === 'single') {
    await sql`select u.id, u.role, u.updated_at, u.name, u.email, u.onboarding_completed,
      (select p.id from marketplace.producers p where p.user_id = u.id limit 1) as producer_id,
      coalesce((select json_agg(json_build_object('organizationId', uo.organization_id, 'role', uo.role, 'managedZoneId', uo.managed_zone_id, 'permissions', rd.permissions, 'organizationName', o.name))
        from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id left join governance.organizations o on o.id = uo.organization_id where uo.user_id = u.id), '[]'::json) as memberships
      from auth.users u where u.id = ${u.id} limit 1`;
    return;
  }
  await Promise.all([
    sql`select id, role, updated_at from auth.users where id = ${u.id} limit 1`,
    sql`select id from marketplace.producers where user_id = ${u.id} limit 1`,
    sql`select uo.organization_id, uo.role, uo.managed_zone_id, rd.permissions from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id where uo.user_id = ${u.id}`,
  ]);
}

async function level(n, label) {
  let inflight = 0, maxInflight = 0, errors = 0;
  const errClasses = {};
  const t0 = performance.now();
  const lat = await Promise.all(Array.from({ length: n }, async () => {
    inflight++; maxInflight = Math.max(maxInflight, inflight);
    const s = performance.now();
    try { await meShape(); } catch (e) { errors++; const c = e.code || e.name; errClasses[c] = (errClasses[c] || 0) + 1; }
    inflight--;
    return performance.now() - s;
  }));
  lat.sort((a, b) => a - b);
  const wall = performance.now() - t0;
  console.log(
    `${label.padEnd(8)} n=${String(n).padEnd(4)} wall=${Math.round(wall)}ms  p50=${Math.round(pct(lat, 50))}  p95=${Math.round(pct(lat, 95))}  p99=${Math.round(pct(lat, 99))}  max=${Math.round(lat.at(-1))}ms` +
    `  erreurs=${errors}${errors ? ' ' + JSON.stringify(errClasses) : ''}  requêtes en attente de connexion (pic)=${Math.max(0, maxInflight * PER - POOL)}  connexions ouvertes(cumul)=${opened}`,
  );
}

console.log(`pool=${POOL} connexions ; forme=${SHAPE} (${PER} requête(s) par appel /api/me)\n`);
await level(1, 'froid');
await level(1, 'chaud');
for (const n of LEVELS.filter((x) => x > 1)) await level(n, 'charge');
await new Promise((r) => setTimeout(r, 200));
const [act] = await sql`select count(*)::int as n from pg_stat_activity where application_name = 'ladini-loadtest'`;
console.log(`\nconnexions serveur du test à la fin : ${act.n} (max autorisé ${POOL})`);
await sql.end();
