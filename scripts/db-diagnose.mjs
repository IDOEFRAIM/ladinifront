// Diagnostic DB LECTURE SEULE — où part le temps ? DNS → TCP → TLS → connexion PG → requête PK → EXPLAIN.
// Usage : npm run db:diagnose        (ne logue ni URL ni identifiants)
import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import postgres from 'postgres';

const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
const raw = (line ?? '').slice(13).replace(/^["']|["']$/g, '');
const url = new URL(raw.split('?')[0]);
const host = url.hostname;
const port = Number(url.port || 5432);
const ms = (t) => `${Math.round(performance.now() - t)} ms`;

async function phase(label, fn) {
  const t = performance.now();
  try { const out = await fn(); console.log(`${label.padEnd(34)} ${ms(t)}`); return out; }
  catch (e) { console.log(`${label.padEnd(34)} ÉCHEC (${e.code || e.name})`); return null; }
}

console.log('— décomposition d\'une connexion FROIDE (3 essais) —');
for (let i = 1; i <= 3; i++) {
  console.log(`essai ${i}`);
  const addr = await phase('  DNS lookup', () => dns.lookup(host));
  if (!addr) continue;
  const sock = await phase('  TCP connect', () => new Promise((res, rej) => {
    const s = net.connect({ host: addr.address, port }, () => res(s)); s.once('error', rej); s.setTimeout(5000, () => rej(Object.assign(new Error('t'), { code: 'TCP_TIMEOUT' })));
  }));
  if (sock) sock.destroy();
  // TLS PostgreSQL : SSLRequest (8 octets) puis handshake TLS.
  await phase('  TLS handshake (SSLRequest+TLS)', () => new Promise((res, rej) => {
    const s = net.connect({ host: addr.address, port }, () => {
      const req = Buffer.alloc(8); req.writeInt32BE(8, 0); req.writeInt32BE(80877103, 4); s.write(req);
    });
    s.once('data', (d) => {
      if (d.toString() !== 'S') return rej(new Error('SSL refusé'));
      const t = tls.connect({ socket: s, rejectUnauthorized: false, servername: host }, () => { t.destroy(); res(); });
      t.once('error', rej);
    });
    s.once('error', rej);
  }));
}

console.log('\n— connexion PG complète + requêtes (client à 1 connexion) —');
const sql = postgres(raw.split('?')[0], { ssl: { rejectUnauthorized: false }, max: 1, prepare: false, connect_timeout: 5, connection: { statement_timeout: 8000, application_name: 'ladini-diagnose' } });
try {
  await phase('connexion + 1re requête (select 1)', () => sql`select 1`);
  await phase('select 1 (connexion chaude)', () => sql`select 1`);
  const [u] = await sql`select id from auth.users limit 1`;
  if (u) {
    await phase('users par PK (chaud)', () => sql`select id, role, updated_at from auth.users where id = ${u.id} limit 1`);
    await phase('producers par user_id', () => sql`select id from marketplace.producers where user_id = ${u.id} limit 1`);
    await phase('memberships + role_defs', () => sql`select uo.organization_id, uo.role, uo.managed_zone_id, rd.permissions from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id where uo.user_id = ${u.id}`);

    console.log('\n— EXPLAIN (ANALYZE, BUFFERS) — lecture seule —');
    for (const [name, q] of [
      ['auth.users PK', sql`explain (analyze, buffers, costs off) select id, role, updated_at from auth.users where id = ${u.id} limit 1`],
      ['producers.user_id', sql`explain (analyze, buffers, costs off) select id from marketplace.producers where user_id = ${u.id} limit 1`],
      ['user_organizations.user_id', sql`explain (analyze, buffers, costs off) select uo.organization_id, uo.role, uo.managed_zone_id, rd.permissions from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id where uo.user_id = ${u.id}`],
    ]) {
      const rows = await q;
      console.log(`\n[${name}]`);
      for (const r of rows) console.log('  ' + r['QUERY PLAN']);
    }
  }
  console.log('\n— pg_stat_activity (autres clients de la DB) —');
  const rows = await sql`select coalesce(application_name, '') as app, state, count(*)::int as n from pg_stat_activity where datname = current_database() group by 1, 2 order by n desc`;
  for (const r of rows) console.log(`  ${(r.app || '(sans nom)').padEnd(24)} ${String(r.state).padEnd(10)} ${r.n}`);
} finally {
  await sql.end();
}
