import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, sum, sql } from 'drizzle-orm';

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
