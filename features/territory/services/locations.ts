import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count } from 'drizzle-orm';
import { CreateLocationSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";
import { checkIdRequired } from '@/features/territory/services/territory-shared';
import { asError } from '@/lib/errors';

export async function getLocations(climaticRegionId?: string) {
  try {
    const where = climaticRegionId ? eq(schema.zones.climaticRegionId, climaticRegionId) : undefined;
    const locations = await db.query.zones.findMany({
      where,
      columns: { id: true, name: true, code: true, isActive: true, climaticRegionId: true },
      orderBy: (t, { asc }) => [asc(t.name)]
    });
    // Compute _count via separate queries
    const [producerCounts, orderCounts, farmCounts] = await Promise.all([
      db.select({ zoneId: schema.producers.zoneId, value: count() }).from(schema.producers).groupBy(schema.producers.zoneId),
      db.select({ zoneId: schema.orders.zoneId, value: count() }).from(schema.orders).groupBy(schema.orders.zoneId),
      db.select({ zoneId: schema.farms.zoneId, value: count() }).from(schema.farms).groupBy(schema.farms.zoneId),
    ]);
    const pMap = new Map(producerCounts.map(c => [c.zoneId, c.value]));
    const oMap = new Map(orderCounts.map(c => [c.zoneId, c.value]));
    const fMap = new Map(farmCounts.map(c => [c.zoneId, c.value]));
    // Fetch climatic region names for mapping
    // Fetch all regions and map by id (avoids using `.in` which can be unsupported in runtime here)
    const regions = await db.query.climaticRegions.findMany({ columns: { id: true, name: true } });
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));

    const locationsWithCounts = locations.map((l) => ({
      ...l,
      climaticRegion: { name: regionMap.get(l.climaticRegionId) || '' },
      _count: { producers: pMap.get(l.id) || 0, orders: oMap.get(l.id) || 0, farms: fMap.get(l.id) || 0 }
    }));
    return { success: true, data: locationsWithCounts };
  } catch (error) {
    console.error("Erreur chargement locations:", error);
    return { success: false, error: "Impossible de charger les locations." };
  }
}

export async function getLocationTree() {
  try {
    const locations = await db.query.zones.findMany({
      orderBy: (t, { asc }) => [asc(t.name)]
    });
    const [pCounts, fCounts] = await Promise.all([
      db.select({ zoneId: schema.producers.zoneId, value: count() }).from(schema.producers).groupBy(schema.producers.zoneId),
      db.select({ zoneId: schema.farms.zoneId, value: count() }).from(schema.farms).groupBy(schema.farms.zoneId),
    ]);
    const pMap2 = new Map(pCounts.map(c => [c.zoneId, c.value]));
    const fMap2 = new Map(fCounts.map(c => [c.zoneId, c.value]));
    const locationsTree = locations.map((l) => ({
      ...l,
      _count: { producers: pMap2.get(l.id) || 0, farms: fMap2.get(l.id) || 0 }
    }));
    return { success: true, data: locationsTree };
  } catch (error) {
    console.error("Erreur chargement arbre:", error);
    return { success: false, error: "Impossible de charger l'arbre territorial." };
  }
}

export async function createLocation(data: {
  name: string;
  code: string;
  parentId?: string;
  climaticRegionId?: string;
}) {
  const validation = CreateLocationSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((e) => e.message).join(', ') };
  }

  // Ensure climatic region is provided because DB schema requires it
  if (!validation.data.climaticRegionId) {
    return { success: false, error: 'La région climatique est requise pour créer une localité.' };
  }

  try {
    const payload: typeof schema.zones.$inferInsert = {
      name: validation.data.name,
      code: validation.data.code,
      climaticRegionId: validation.data.climaticRegionId,
    };
    const [location] = await db.insert(schema.zones).values(payload).returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'CREATE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: location.id,
      newValue: { name: location.name, code: location.code },
    });

    return { success: true, data: location };
  } catch (_error: unknown) {
    const error = asError(_error);
    if (error.code === 'P2002' || error.code === '23505') {
      return { success: false, error: "Ce nom ou code de location existe déjà." };
    }
    console.error("Erreur création location:", error);
    return { success: false, error: "Impossible de créer la location." };
  }
}

export async function updateLocation(id: string, data: Partial<{
  name: string;
  code: string;
  parentId: string;
  climaticRegionId: string;
  isActive: boolean;
}>) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const oldLocation = await db.query.zones.findFirst({
      where: eq(schema.zones.id, id),
      columns: { name: true, code: true, isActive: true }
    });
    const [location] = await db.update(schema.zones).set(data).where(eq(schema.zones.id, id)).returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'UPDATE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: oldLocation,
      newValue: data,
    });

    return { success: true, data: location };
  } catch (_error: unknown) {
    const error = asError(_error);
    if (error.code === 'P2002' || error.code === '23505') {
      return { success: false, error: "Ce code de location existe déjà." };
    }
    console.error("Erreur mise à jour location:", error);
    return { success: false, error: "Impossible de mettre à jour la location." };
  }
}

export async function toggleLocationActive(id: string) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const location = await db.query.zones.findFirst({ where: eq(schema.zones.id, id) });
    if (!location) return { success: false, error: "Location introuvable." };

    const [updated] = await db.update(schema.zones)
      .set({ isActive: !location.isActive })
      .where(eq(schema.zones.id, id))
      .returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'TOGGLE_LOCATION_ACTIVE',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: { isActive: location.isActive },
      newValue: { isActive: updated.isActive },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Erreur toggle location:", error);
    return { success: false, error: "Impossible de basculer l'état de la location." };
  }
}

export async function deleteLocation(id: string) {
  try {
    const [[{ value: pCount }], [{ value: oCount }], [{ value: fCount }]] = await Promise.all([
      db.select({ value: count() }).from(schema.producers).where(eq(schema.producers.zoneId, id)),
      db.select({ value: count() }).from(schema.orders).where(eq(schema.orders.zoneId, id)),
      db.select({ value: count() }).from(schema.farms).where(eq(schema.farms.zoneId, id)),
    ]);
    const total = pCount + oCount + fCount;
    if (total > 0) {
      return { success: false, error: `Impossible : ${total} entité(s) liée(s) à cette location.` };
    }

    const oldLoc = await db.query.zones.findFirst({ where: eq(schema.zones.id, id), columns: { name: true, code: true } });
    await db.delete(schema.zones).where(eq(schema.zones.id, id));

    const userId = await getUserIdFromSession();
    await audit({
      action: 'DELETE_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Location',
      entityId: id,
      oldValue: oldLoc,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression location:", error);
    return { success: false, error: "Impossible de supprimer la location." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  ADMIN LEVELS                                ║
// ╚══════════════════════════════════════════════╝

// Admin levels were removed from the schema; placeholder removed.

// ╔══════════════════════════════════════════════╗
// ║  STATISTIQUES TERRITORIALES                  ║
// ╚══════════════════════════════════════════════╝
