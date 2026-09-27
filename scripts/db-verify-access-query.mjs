// Vérifie (LECTURE SEULE, vraie base) que la requête unique du contexte d'accès est équivalente aux 3 anciennes
// lectures, et affiche son plan. Usage : node scripts/db-verify-access-query.mjs
import fs from 'node:fs';
import postgres from 'postgres';

const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
const url = (line ?? '').slice(13).replace(/^["']|["']$/g, '').split('?')[0];
const sql = postgres(url, { ssl: { rejectUnauthorized: false }, max: 2, prepare: false, connect_timeout: 5, connection: { statement_timeout: 8000, application_name: 'ladini-verify' } });

const single = (id) => sql`
  select u.id, u.role, u.updated_at, u.name, u.email, u.onboarding_completed,
    (select p.id from marketplace.producers p where p.user_id = u.id limit 1) as producer_id,
    coalesce((
      select json_agg(json_build_object(
        'organizationId', uo.organization_id, 'role', uo.role, 'managedZoneId', uo.managed_zone_id,
        'permissions', rd.permissions, 'organizationName', o.name))
      from governance.user_organizations uo
      left join governance.role_definitions rd on rd.id = uo.role_id
      left join governance.organizations o on o.id = uo.organization_id
      where uo.user_id = u.id
    ), '[]'::json) as memberships
  from auth.users u where u.id = ${id} limit 1`;

async function legacy(id) {
  const [[user], [producer], memberships] = await Promise.all([
    sql`select id, role, updated_at from auth.users where id = ${id} limit 1`,
    sql`select id from marketplace.producers where user_id = ${id} limit 1`,
    sql`select uo.organization_id, uo.role, uo.managed_zone_id, rd.permissions from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id where uo.user_id = ${id}`,
  ]);
  return { user, producer, memberships };
}

const norm = (m) => JSON.stringify([...m].sort((a, b) => String(a.organizationId).localeCompare(String(b.organizationId))));

try {
  // Échantillon : utilisateurs avec organisations, producteurs, admins, plus un sans rien.
  const ids = (await sql`
    (select distinct user_id as id from governance.user_organizations limit 8)
    union (select user_id from marketplace.producers limit 4)
    union (select id from auth.users where role in ('ADMIN','SUPERADMIN') limit 2)
    union (select id from auth.users limit 3)`).map((r) => r.id);

  let ok = 0, bad = 0;
  for (const id of ids) {
    const [[s], l] = await Promise.all([single(id), legacy(id)]);
    const oldMem = l.memberships.map((m) => ({ organizationId: m.organization_id, role: m.role, managedZoneId: m.managed_zone_id, permissions: m.permissions }));
    const newMem = (s.memberships ?? []).map((m) => ({ organizationId: m.organizationId, role: m.role, managedZoneId: m.managedZoneId, permissions: m.permissions }));
    const same =
      s.role === l.user.role &&
      String(s.updated_at) === String(l.user.updated_at) &&
      (s.producer_id ?? null) === (l.producer?.id ?? null) &&
      norm(oldMem) === norm(newMem);
    same ? ok++ : bad++;
    if (!same) console.log('DIFFÉRENCE pour un utilisateur', { role: [s.role, l.user.role], producer: [s.producer_id, l.producer?.id], old: oldMem, neu: newMem });
  }
  console.log(`équivalence : ${ok} identiques, ${bad} différents sur ${ids.length} utilisateurs (avec/sans organisations, producteurs, admins)`);
  const withOrgs = (await Promise.all(ids.map(async (id) => (await single(id))[0].memberships.length))).filter((n) => n > 0).length;
  console.log(`dont ${withOrgs} avec au moins une organisation`);

  const [any] = ids;
  const plan = await sql`explain (analyze, buffers, costs off) select u.id, u.role, u.updated_at, u.name, u.email, u.onboarding_completed,
    (select p.id from marketplace.producers p where p.user_id = u.id limit 1) as producer_id,
    coalesce((select json_agg(json_build_object('organizationId', uo.organization_id, 'role', uo.role, 'managedZoneId', uo.managed_zone_id, 'permissions', rd.permissions, 'organizationName', o.name))
      from governance.user_organizations uo left join governance.role_definitions rd on rd.id = uo.role_id left join governance.organizations o on o.id = uo.organization_id where uo.user_id = u.id), '[]'::json) as memberships
    from auth.users u where u.id = ${any} limit 1`;
  console.log('\nplan de la requête unique :');
  for (const r of plan) console.log('  ' + r['QUERY PLAN']);
} finally {
  await sql.end();
}
