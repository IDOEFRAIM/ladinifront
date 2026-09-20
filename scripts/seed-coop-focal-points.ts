/*
  Seed : points focaux de coopératives (profil PRODUCER + ADMIN de leur coopérative).
  Idempotent : un numéro déjà présent est ignoré (aucun mot de passe écrasé).
  Usage : npx tsx scripts/seed-coop-focal-points.ts
*/
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, schema } from '@/src/db';
import { eq } from 'drizzle-orm';

const FOCAL_POINTS = [
  { phone: '+22678005103', name: 'GARIKO Leila',           password: 'leilagariko',        coop: 'Fromagerie Gariko', zone: 'OUA-001' },
  { phone: '+22671767695', name: 'DIALLO Sibé',            password: 'diallosidibekossam', coop: 'Kosam Yadega', zone: 'OUA-001' },
  { phone: '+22670243204', name: 'TIENDREBEOGO Mamounata', password: 'mamounatafen',       coop: 'AFEN', zone: 'OUA-001' },
  { phone: '+22676032262', name: 'SEDEGO Mamounata',       password: 'soulama',            coop: 'Coopérative Sougri Nooma', zone: 'OUA-001' },
  { phone: '+22665521301', name: 'OUEDRAOGO Jean',         password: 'jeanodgurjpaf',      coop: 'URJPAF', zone: 'HOUET' },
  { phone: '+22678956709', name: 'OUEDRAOGO René',         password: 'reneurjpaf',         coop: 'URJPAF', zone: 'OUA-001' },
];

async function ensureCoop(name: string) {
  const existing = await db.query.organizations.findFirst({
    where: eq(schema.organizations.name, name), columns: { id: true },
  });
  if (existing) return existing.id;
  const [org] = await db.insert(schema.organizations)
    .values({ name, type: 'COOPERATIVE' as any, status: 'ACTIVE' as any })
    .returning({ id: schema.organizations.id });
  return org.id;
}

async function main() {
  for (const fp of FOCAL_POINTS) {
    const exists = await db.query.users.findFirst({ where: eq(schema.users.phone, fp.phone), columns: { id: true } });
    if (exists) { console.log(`= ${fp.phone} (${fp.name}) existe déjà — ignoré`); continue; }

    const orgId = await ensureCoop(fp.coop);
    const zone = await db.query.zones.findFirst({ where: eq(schema.zones.code, fp.zone), columns: { id: true } });
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values({
        name: fp.name,
        phone: fp.phone,
        password: await bcrypt.hash(fp.password, 12),
        role: 'PRODUCER' as any,
        zoneId: zone?.id,
        onboardingCompleted: true,
      }).returning({ id: schema.users.id });
      await tx.insert(schema.producers).values({
        userId: user.id, organizationId: orgId, businessName: fp.coop, status: 'ACTIVE' as any, zoneId: zone?.id,
      });
      await tx.insert(schema.userOrganizations).values({
        userId: user.id, organizationId: orgId, role: 'ADMIN' as any,
      });
    });
    console.log(`+ ${fp.phone} → ${fp.name} (${fp.coop})`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
