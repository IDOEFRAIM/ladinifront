/*
  Seed script: inserts minimal data for a clean database and creates an admin user.
  - Climatic region + one active zone
  - One ACTIVE organization
  - Buyer types (a few defaults)
  - Admin user (email: ido@gmail.com, password: azerty, role: ADMIN)
  - Link admin to organization (role ADMIN) and set managed zone
  - Optional: basic categories/subcategories + standard prices (using admin as updater)

  Usage (ensure DATABASE_URL is set in .env or environment):
    npx tsx scripts/seed.ts
  or
    npx ts-node scripts/seed.ts
*/

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, schema } from '@/src/db';
import { eq, and } from 'drizzle-orm';

async function ensureClimaticRegion(name: string, description?: string) {
  const existing = await db.query.climaticRegions.findFirst({
    where: eq(schema.climaticRegions.name, name),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.climaticRegions).values({ name, description: description || null }).returning({ id: schema.climaticRegions.id });
  return row.id;
}

async function ensureZone(input: { name: string; code: string; climaticRegionId: string; latitude?: number; longitude?: number; }) {
  const existing = await db.query.zones.findFirst({
    where: and(eq(schema.zones.code, input.code), eq(schema.zones.name, input.name)),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.zones).values({
    name: input.name,
    code: input.code,
    climaticRegionId: input.climaticRegionId,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isActive: true,
  }).returning({ id: schema.zones.id });
  return row.id;
}

async function ensureOrganization(input: { name: string; type: string; status?: string; description?: string; taxId?: string | null; }) {
  const existing = await db.query.organizations.findFirst({
    where: eq(schema.organizations.name, input.name),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.organizations).values({
    name: input.name,
    type: input.type as any,
    status: (input.status || 'ACTIVE') as any,
    description: input.description || null,
    taxId: input.taxId || null,
  }).returning({ id: schema.organizations.id });
  return row.id;
}

async function ensureBuyerType(name: string, description?: string | null) {
  const existing = await db.query.buyerTypes.findFirst({
    where: eq(schema.buyerTypes.name, name),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.buyerTypes).values({ name, description: description || null }).returning({ id: schema.buyerTypes.id });
  return row.id;
}

async function ensureUserAdmin(input: { email: string; password: string; name: string; role?: string; zoneId?: string; }) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, input.email),
    columns: { id: true },
  });
  if (existing) return existing.id;

  const hashed = await bcrypt.hash(input.password, 12);
  const [row] = await db.insert(schema.users).values({
    email: input.email,
    password: hashed,
    name: input.name,
    role: (input.role || 'ADMIN') as any,
    zoneId: input.zoneId || null,
    onboardingCompleted: true,
  }).returning({ id: schema.users.id });
  return row.id;
}

async function ensureUserOrganization(userId: string, organizationId: string, role: string, managedZoneId?: string) {
  const existing = await db.query.userOrganizations.findFirst({
    where: and(eq(schema.userOrganizations.userId, userId), eq(schema.userOrganizations.organizationId, organizationId)),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.userOrganizations).values({
    userId,
    organizationId,
    role: role as any,
    managedZoneId: managedZoneId || null,
  }).returning({ id: schema.userOrganizations.id });
  return row.id;
}

async function ensureCategory(name: string, description?: string | null) {
  const existing = await db.query.categories.findFirst({
    where: eq(schema.categories.name, name),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.categories).values({ name, description: description || null }).returning({ id: schema.categories.id });
  return row.id;
}

async function ensureSubCategory(categoryId: string, name: string) {
  const existing = await db.query.subCategories.findFirst({
    where: and(eq(schema.subCategories.categoryId, categoryId), eq(schema.subCategories.name, name)),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.subCategories).values({ categoryId, name }).returning({ id: schema.subCategories.id });
  return row.id;
}

async function ensureStandardPrice(subCategoryId: string, zoneId: string, pricePerUnit: number, unit: string, updatedById: string) {
  const existing = await db.query.standardPrices.findFirst({
    where: and(eq(schema.standardPrices.subCategoryId, subCategoryId), eq(schema.standardPrices.zoneId, zoneId)),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const [row] = await db.insert(schema.standardPrices).values({
    subCategoryId,
    zoneId,
    pricePerUnit,
    unit: unit as any,
    updatedById,
  }).returning({ id: schema.standardPrices.id });
  return row.id;
}

async function main() {
  console.log('Starting seed...');

  // 1) Base geography
  const regionId = await ensureClimaticRegion('Default Region', 'Default climatic region');
  const zoneId = await ensureZone({ name: 'Ouaga Centre', code: 'OUA-001', climaticRegionId: regionId, latitude: 12.3714, longitude: -1.5197 });

  // 2) Organization (ACTIVE for onboarding list)
  const orgId = await ensureOrganization({ name: 'AgriMarket', type: 'PRIVATE_TRADER', status: 'ACTIVE', description: 'Default active organization' });

  // 3) Buyer types (for onboarding BUYER)
  await Promise.all([
    ensureBuyerType('Restaurant', 'Restauration'),
    ensureBuyerType('Grossiste', 'Achat en gros'),
    ensureBuyerType('Supermarché', 'Grande distribution'),
  ]);

  // 4) Admin user
  const adminUserId = await ensureUserAdmin({ email: 'ido@gmail.com', password: 'azerty', name: 'Admin Ido', role: 'ADMIN', zoneId });

  // Link admin to organization and set managed zone (optional but useful)
  await ensureUserOrganization(adminUserId, orgId, 'ADMIN', zoneId);

  // 5) Optional catalog minimal setup (safe defaults)
  const catCerealesId = await ensureCategory('Céréales');
  const catLegumesId = await ensureCategory('Légumes');
  const scMaisId = await ensureSubCategory(catCerealesId, 'Maïs');
  const scTomateId = await ensureSubCategory(catLegumesId, 'Tomate');

  // Standard prices seeded with admin as updater (non-critical if fails)
  await Promise.all([
    ensureStandardPrice(scMaisId, zoneId, 250.0, 'KG', adminUserId),
    ensureStandardPrice(scTomateId, zoneId, 400.0, 'KG', adminUserId),
  ]);

  console.log('Seed completed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
