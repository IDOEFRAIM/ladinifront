'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, sum, sql } from 'drizzle-orm';
import { CreateClimaticRegionSchema, CreateLocationSchema } from "@/lib/validators";
import { audit } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";

// ╔══════════════════════════════════════════════╗
// ║  RÉGIONS CLIMATIQUES                         ║
// ╚══════════════════════════════════════════════╝

export async function getClimaticRegions() {
  try {
    // Fetch regions and compute zones count in a separate grouped query to avoid using `.with`
    const regions = await db.query.climaticRegions.findMany({
      columns: { id: true, name: true, description: true },
      orderBy: (t, { asc }) => [asc(t.name)]
    });

    const zoneCounts = await db.select({ regionId: schema.zones.climaticRegionId, value: count() })
      .from(schema.zones)
      .groupBy(schema.zones.climaticRegionId);

    const zMap = new Map(zoneCounts.map(c => [c.regionId, c.value]));
    const regionsWithCount = regions.map((r: any) => ({
      ...r,
      _count: { zones: zMap.get(r.id) || 0 }
    }));

    return { success: true, data: regionsWithCount };
  } catch (error) {
    console.error("Erreur chargement régions:", error);
    return { success: false, error: "Impossible de charger les régions." };
  }
}

export async function createClimaticRegion(data: { name: string; description?: string }) {
  const validation = CreateClimaticRegionSchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.issues.map((e: any) => e.message).join(', ') };
  }

  try {
    const existing = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.name, validation.data.name) });
    if (existing) return { success: false, error: "Cette région existe déjà." };

    const [region] = await db.insert(schema.climaticRegions).values(validation.data).returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'CREATE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: region.id,
      newValue: { name: region.name },
    });

    return { success: true, data: region };
  } catch (error) {
    console.error("Erreur création région:", error);
    return { success: false, error: "Impossible de créer la région." };
  }
}

function checkIdRequired(id: string) {
  if (!id) return { success: false, error: "ID requis" };
  return null;
}

export async function updateClimaticRegion(id: string, data: { name?: string; description?: string }) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const oldRegion = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.id, id), columns: { name: true, description: true } });
    const [region] = await db.update(schema.climaticRegions)
      .set({ name: data.name, description: data.description })
      .where(eq(schema.climaticRegions.id, id))
      .returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'UPDATE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: id,
      oldValue: oldRegion,
      newValue: { name: data.name, description: data.description },
    });

    return { success: true, data: region };
  } catch (error) {
    console.error("Erreur mise à jour région:", error);
    return { success: false, error: "Impossible de mettre à jour la région." };
  }
}

export async function deleteClimaticRegion(id: string) {
  const idError = checkIdRequired(id);
  if (idError) return idError;

  try {
    const [{ value: locationsCount }] = await db.select({ value: count() }).from(schema.zones).where(eq(schema.zones.climaticRegionId, id));
    if (locationsCount > 0) {
      return { success: false, error: `Impossible : ${locationsCount} lieu(x) rattaché(s) à cette région.` };
    }

    const oldRegion = await db.query.climaticRegions.findFirst({ where: eq(schema.climaticRegions.id, id), columns: { name: true } });
    await db.delete(schema.climaticRegions).where(eq(schema.climaticRegions.id, id));

    const userId = await getUserIdFromSession();
    await audit({
      action: 'DELETE_CLIMATIC_REGION',
      actorId: userId ?? 'system',
      entityType: 'ClimaticRegion',
      entityId: id,
      oldValue: oldRegion,
    });

    return { success: true };
  } catch (error) {
    console.error("Erreur suppression région:", error);
    return { success: false, error: "Impossible de supprimer la région." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  LOCATIONS (Hiérarchie Administrative)       ║
// ╚══════════════════════════════════════════════╝

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
    const regionMap = new Map(regions.map((r: any) => [r.id, r.name]));

    const locationsWithCounts = locations.map((l: any) => ({
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
    const locationsTree = locations.map((l: any) => ({
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
    return { success: false, error: validation.error.issues.map((e: any) => e.message).join(', ') };
  }

  // Ensure climatic region is provided because DB schema requires it
  if (!validation.data.climaticRegionId) {
    return { success: false, error: 'La région climatique est requise pour créer une localité.' };
  }

  try {
    const payload: any = {
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
  } catch (error: any) {
    if (error.code === 'P2002' || (error as any).code === '23505') {
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
    const [location] = await db.update(schema.zones).set(data as any).where(eq(schema.zones.id, id)).returning();

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
  } catch (error: any) {
    if (error.code === 'P2002' || (error as any).code === '23505') {
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

export async function getTerritoryStats() {
  try {
    const [
      [{ value: totalLocations }],
      [{ value: activeLocations }],
      [{ value: totalRegions }],
      [{ value: totalProducers }],
      [{ value: totalOrders }],
      rawLocationStats,
      statProducerCounts,
      statOrderCounts,
      statFarmCounts,
      statGmvCounts
    ] = await Promise.all([
      db.select({ value: count() }).from(schema.zones),
      db.select({ value: count() }).from(schema.zones).where(eq(schema.zones.isActive, true)),
      db.select({ value: count() }).from(schema.climaticRegions),
      db.select({ value: count() }).from(schema.producers),
      db.select({ value: count() }).from(schema.orders),
      db.query.zones.findMany({
        columns: { id: true, name: true, code: true, isActive: true, climaticRegionId: true },
        orderBy: (t, { asc }) => [asc(t.name)]
      }),
      db.select({ zoneId: schema.producers.zoneId, value: count() }).from(schema.producers).groupBy(schema.producers.zoneId),
      db.select({ zoneId: schema.orders.zoneId, value: count() }).from(schema.orders).groupBy(schema.orders.zoneId),
      db.select({ zoneId: schema.farms.zoneId, value: count() }).from(schema.farms).groupBy(schema.farms.zoneId),
      // sum of order amounts per zone
      db.select({ zoneId: schema.orders.zoneId, value: sum(schema.orders.totalAmount) }).from(schema.orders).groupBy(schema.orders.zoneId),
    ]);

    const spMap = new Map(statProducerCounts.map(c => [c.zoneId, c.value]));
    const soMap = new Map(statOrderCounts.map(c => [c.zoneId, c.value]));
    const sfMap = new Map(statFarmCounts.map(c => [c.zoneId, c.value]));
    const sgmvMap = new Map((statGmvCounts || []).map((c: any) => [c.zoneId, c.value]));

    // Resolve climatic region names
    // Resolve climatic region names by fetching all regions (small table expected)
    const regions = await db.query.climaticRegions.findMany({ columns: { id: true, name: true } });
    const regionMap = new Map(regions.map((r: any) => [r.id, r.name]));

    const mappedStats = rawLocationStats.map((l: any) => ({
      id: l.id,
      name: l.name,
      code: l.code,
      isActive: l.isActive,
      climaticRegion: regionMap.get(l.climaticRegionId) || null,
      producers: spMap.get(l.id) || 0,
      orders: soMap.get(l.id) || 0,
      farms: sfMap.get(l.id) || 0,
      gmv: Number(sgmvMap.get(l.id) || 0),
    }));

    return {
      success: true,
      data: {
        totalLocations,
        activeLocations,
        totalRegions,
        totalProducers,
        totalOrders,
        locationStats: mappedStats,
      }
    };
  } catch (error) {
    console.error("Erreur stats territoire:", error);
    return { success: false, error: "Impossible de charger les statistiques." };
  }
}

export async function getLocationStats(locationId: string) {
  try {
    if (!locationId) return { success: false, error: 'Location id required' };

    const [{ value: producersCount }] = await db.select({ value: count() }).from(schema.producers).where(eq(schema.producers.zoneId, locationId));
    const [{ value: farmsCount }] = await db.select({ value: count() }).from(schema.farms).where(eq(schema.farms.zoneId, locationId));
    const [{ value: ordersCount }] = await db.select({ value: count() }).from(schema.orders).where(eq(schema.orders.zoneId, locationId));
    const [{ value: gmvSum }] = await db.select({ value: sum(schema.orders.totalAmount) }).from(schema.orders).where(eq(schema.orders.zoneId, locationId));

    // Top producers by GMV: join products -> order_items -> orders filtered by zone
    const topProducers = await db.execute(sql`
      SELECT p.id, p.business_name, COALESCE(SUM(oi.price_at_sale * oi.quantity),0) AS gmv, COUNT(DISTINCT o.id) AS orders_count
      FROM marketplace.producers p
      LEFT JOIN marketplace.products prod ON prod.producer_id = p.id
      LEFT JOIN marketplace.order_items oi ON oi.product_id = prod.id
      LEFT JOIN marketplace.orders o ON o.id = oi.order_id AND o.zone_id = ${locationId}::uuid
      WHERE p.zone_id = ${locationId}::uuid
      GROUP BY p.id, p.business_name
      ORDER BY gmv DESC
      LIMIT 5
    `);

    const recentOrders = await db.query.orders.findMany({
      where: eq(schema.orders.zoneId, locationId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 10,
      columns: { id: true, customerName: true, customerPhone: true, totalAmount: true, createdAt: true, status: true }
    });

    return {
      success: true,
      data: {
        producersCount: Number(producersCount ?? 0),
        farmsCount: Number(farmsCount ?? 0),
        ordersCount: Number(ordersCount ?? 0),
        gmv: Number(gmvSum ?? 0),
        topProducers: Array.isArray(topProducers) ? topProducers : [],
        recentOrders,
      }
    };
  } catch (error) {
    console.error('Erreur getLocationStats:', error);
    return { success: false, error: 'Impossible de charger les statistiques de la localité.' };
  }
}

// Legacy aliases
export const getZones = getLocations;
export const createZone = createLocation;
export const updateZone = updateLocation;
export const toggleZoneActive = toggleLocationActive;
export const deleteZone = deleteLocation;
