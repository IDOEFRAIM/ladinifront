/*
  Seed : comptes de TEST (un producteur, un acheteur).
  Idempotent : un numéro déjà présent est ignoré (aucun mot de passe écrasé).
  Usage :  npx tsx scripts/seed-test-users.ts            (créer)
           npx tsx scripts/seed-test-users.ts --delete   (supprimer ces deux comptes)
  ⚠ Mots de passe connus et faibles : à SUPPRIMER (option --delete) avant toute ouverture au public.
*/
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, schema } from '@/src/db';
import { eq, inArray } from 'drizzle-orm';

const TEST_USERS = [
  { phone: '+22600000000', name: 'TEST Producteur', password: 'azerty1234', role: 'PRODUCER' as const },
  { phone: '+22699999999', name: 'TEST Acheteur',   password: 'azerty1234', role: 'BUYER' as const },
];
const ZONE_CODE = 'OUA-001';

async function remove() {
  const users = await db.select({ id: schema.users.id, phone: schema.users.phone }).from(schema.users)
    .where(inArray(schema.users.phone, TEST_USERS.map((u) => u.phone)));
  for (const u of users) {
    await db.transaction(async (tx) => {
      await tx.delete(schema.userOrganizations).where(eq(schema.userOrganizations.userId, u.id));
      await tx.delete(schema.producers).where(eq(schema.producers.userId, u.id));
      await tx.delete(schema.buyerProfiles).where(eq(schema.buyerProfiles.userId, u.id));
      await tx.delete(schema.users).where(eq(schema.users.id, u.id));
    });
    console.log(`- ${u.phone} supprimé`);
  }
  if (users.length === 0) console.log('Aucun compte de test à supprimer.');
}

async function main() {
  if (process.argv.includes('--delete')) return remove();

  const [zone] = await db
    .select({ id: schema.zones.id, region: schema.climaticRegions.name })
    .from(schema.zones)
    .leftJoin(schema.climaticRegions, eq(schema.climaticRegions.id, schema.zones.climaticRegionId))
    .where(eq(schema.zones.code, ZONE_CODE)).limit(1);

  for (const t of TEST_USERS) {
    const exists = await db.query.users.findFirst({ where: eq(schema.users.phone, t.phone), columns: { id: true } });
    if (exists) { console.log(`= ${t.phone} (${t.name}) existe déjà — ignoré`); continue; }

    await db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.users).values({
        name: t.name,
        phone: t.phone,
        password: await bcrypt.hash(t.password, 12),
        role: t.role as any,
        zoneId: zone?.id,
        onboardingCompleted: true,
        whatsappEnabled: false, // jamais de message WhatsApp vers un numéro fictif
      }).returning({ id: schema.users.id });

      if (t.role === 'PRODUCER') {
        await tx.insert(schema.producers).values({
          userId: user.id, businessName: 'Ferme Test', status: 'ACTIVE' as any,
          zoneId: zone?.id, region: zone?.region ?? undefined, phoneNumber: t.phone,
        });
      } else {
        await tx.insert(schema.buyerProfiles).values({
          userId: user.id, establishmentName: 'Acheteur Test', isVerified: false,
        });
      }
    });
    console.log(`+ ${t.phone} → ${t.name} (${t.role})`);
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
