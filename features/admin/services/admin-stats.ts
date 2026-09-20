import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql, count, sum, countDistinct, desc } from 'drizzle-orm';
import { assertAdmin } from '@/features/admin/services/admin-guard';

export async function getAdminDashboardStats() {
  try {
    await assertAdmin();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. On récupère tout en une fois
    const [
      countsRes,
      geoStats,
      orderStats,
      recentActivityRaw,
      topZonesRaw
    ] = await Promise.all([
      
      // A. Utilisateurs & Produits
      db.execute(sql`SELECT 
          (SELECT COUNT(*)::int FROM auth.users) as users,
          (SELECT COUNT(*)::int FROM marketplace.products) as products`),

      // B. Géo & Producteurs
      db.select({
        totalRegions: countDistinct(schema.climaticRegions.id),
        totalZones: countDistinct(schema.zones.id),
        totalProducers: count(schema.producers.id),
        pendingProducers: sql`count(*) filter (where ${schema.producers.status} = 'PENDING')`,
        activeProducers: sql`count(*) filter (where ${schema.producers.status} = 'ACTIVE')`,
      }).from(schema.producers)
        .leftJoin(schema.zones, eq(schema.producers.zoneId, schema.zones.id))
        .leftJoin(schema.climaticRegions, eq(schema.zones.climaticRegionId, schema.climaticRegions.id)),

      // C. Ventes
      db.select({
        totalOrders: count(schema.orders.id),
        pendingOrders: sql`count(*) filter (where ${schema.orders.status} = 'PENDING')`,
        totalRevenue: sum(schema.orders.totalAmount),
        orders7d: sql`count(*) filter (where ${schema.orders.createdAt} >= ${sevenDaysAgo.toISOString()})`,
      }).from(schema.orders),

      // D. Flux d'activité (Jointures manuelles pour éviter l'erreur 'referencedTable')
      db.select({
        id: schema.orders.id,
        customerName: schema.orders.customerName,
        amount: schema.orders.totalAmount,
        status: schema.orders.status,
        date: schema.orders.createdAt,
        producerName: schema.producers.businessName,
      })
      .from(schema.orders)
      .leftJoin(schema.orderItems, eq(schema.orders.id, schema.orderItems.orderId))
      .leftJoin(schema.products, eq(schema.orderItems.productId, schema.products.id))
      .leftJoin(schema.producers, eq(schema.products.producerId, schema.producers.id))
      .orderBy(desc(schema.orders.createdAt))
      .limit(10),

      // E. Top Zones
      db.select({
        id: schema.zones.id,
        name: schema.zones.name,
        region: schema.climaticRegions.name,
        producers: countDistinct(schema.producers.id),
        orders: countDistinct(schema.orders.id),
      })
      .from(schema.zones)
      .leftJoin(schema.climaticRegions, eq(schema.zones.climaticRegionId, schema.climaticRegions.id))
      .leftJoin(schema.producers, eq(schema.producers.zoneId, schema.zones.id))
      .leftJoin(schema.orders, eq(schema.orders.zoneId, schema.zones.id))
      .groupBy(schema.zones.id, schema.zones.name, schema.climaticRegions.name)
      .orderBy(desc(sql`count(distinct ${schema.orders.id})`))
      .limit(3)
    ]);

    const usersProducts = (countsRes as any)[0];
    const geo = geoStats[0];
    const sales = orderStats[0];

    const totalUsers = Number(usersProducts.users || 0);
    const totalOrders = Number(sales.totalOrders || 0);
    const totalRevenue = Number(sales.totalRevenue || 0);

    return {
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        pendingOrders: Number(sales.pendingOrders || 0),
        totalProducers: Number(geo.totalProducers || 0),
        activeProducers: Number(geo.activeProducers || 0),
        pendingProducers: Number(geo.pendingProducers || 0),
        totalProducts: Number(usersProducts.products || 0),
        totalUsers,
        totalLocations: Number(geo.totalZones || 0),
        totalRegions: Number(geo.totalRegions || 0),
        avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
        conversion7d: totalUsers > 0 ? (Number(sales.orders7d || 0) / totalUsers) : 0,
        topZones: topZonesRaw,
        recentActivity: recentActivityRaw.map(a => ({
          ...a,
          producerName: a.producerName || 'Nom non definie'
        }))
      }
    };
  } catch (error) {
    console.error("ERREUR DASHBOARD:", error);
    return { success: false, error: "Erreur technique" };
  }
}



// ╔══════════════════════════════════════════════╗
// ║  PRODUCTEURS                                 ║
// ╚══════════════════════════════════════════════╝

/** * Récupère la liste des producteurs avec leurs informations de base, nombre de produits, fermes, commandes, etc.
 * @returns { success: boolean; data?: AdminProducer[]; error?: string }  
 *  */
