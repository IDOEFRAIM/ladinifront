'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql, count, sum, gte, countDistinct, desc } from 'drizzle-orm';

export async function getAdminDashboardStats() {
  try {
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


export async function getAdminProducers() {
  try {
    // Fetch producers with user and zone relations
    interface ProducerWithRelations {
      id: string;
      businessName: string | null;
      status: string;
      zoneId: string | null;
      createdAt: Date;
      user: {
        email: string | null;
        phone: string | null;
        createdAt: Date;
      };
      zone: {
        id: string;
        name: string;
      } | null;
    }

    const producersRaw = await db.query.producers.findMany({
      with: {
        user: { columns: { email: true, phone: true, createdAt: true } },
        zone: { columns: { id: true, name: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }) as ProducerWithRelations[];

    // Count products and farms per producer
    const [productCountsByProducer, farmCountsByProducer] = await Promise.all([
      db.select({ producerId: schema.products.producerId, count: count() })
        .from(schema.products)
        .groupBy(schema.products.producerId),
      db.select({ producerId: schema.farms.producerId, count: count() })
        .from(schema.farms)
        .groupBy(schema.farms.producerId),
    ]);

    const prodCountMap = new Map(productCountsByProducer.map(r => [r.producerId, Number(r.count)]));
    const farmCountMap = new Map(farmCountsByProducer.map(r => [r.producerId, Number(r.count)]));

    // Compter les commandes par producteur via orderItems
    const producerOrders = await db
      .select({ productId: schema.orderItems.productId, count: count() })
      .from(schema.orderItems)
      .groupBy(schema.orderItems.productId);

    const productToProducer = await db
      .select({ id: schema.products.id, producerId: schema.products.producerId })
      .from(schema.products);

    const orderCountByProducer = new Map<string, number>();
    for (const po of producerOrders) {
      const prod = productToProducer.find(p => p.id === po.productId);
      if (prod) {
        orderCountByProducer.set(
          prod.producerId,
          (orderCountByProducer.get(prod.producerId)) + Number(po.count)
        );
      }
    }

    interface AdminProducer {
      id: string;
      businessName: string;
      status: string;
      email: string;
      phone: string;
      zone: string;
      zoneId: string | null;
      productsCount: number;
      farmsCount: number;
      totalOrders: number;
      registrationDate: string;
    }

    interface AdminProducersResponse {
      success: true;
      data: AdminProducer[];
    }

    const formattedProducers: AdminProducer[] = producersRaw.map((p): AdminProducer => ({
      id: p.id,
      businessName: p.businessName || 'Sans nom',
      status: p.status,
      email: p.user?.email || '',
      phone: p.user?.phone || '',
      zone: p.zone?.name || 'Non assigné',
      zoneId: p.zone?.id || null,
      productsCount: prodCountMap.get(p.id),
      farmsCount: farmCountMap.get(p.id),
      totalOrders: orderCountByProducer.get(p.id),
      registrationDate: p.user && p.user.createdAt ? p.user.createdAt.toISOString() : '',
    }));

    return {
      success: true,
      data: formattedProducers
    } as AdminProducersResponse;
  } catch (error) {
    console.error("Erreur chargement producteurs admin:", error);
    return { success: false, error: "Impossible de charger les producteurs." };
  }
}

/**
 * 
 * Met à jour le statut d'un producteur (ex: PENDING, ACTIVE, REJECTED)
 * @param producerId ID du producteur à mettre à jour
 * @param statusId Nouveau statut à appliquer
 * @returns { success: boolean; data?: any; error?: string }
 */
export async function updateProducerStatus(producerId: string, statusId: string) {
  if (!producerId) return { success: false, error: "ID requis" };

  try {
    const oldProducer = await db.query.producers.findFirst({
      where: eq(schema.producers.id, producerId),
      columns: { status: true },
    });
    const [updated] = await db.update(schema.producers)
      .set({ status: statusId as any })
      .where(eq(schema.producers.id, producerId))
      .returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'UPDATE_PRODUCER_STATUS',
      actorId: userId ?? 'system',
      entityType: 'Producer',
      entityId: producerId,
      oldValue: { status: oldProducer?.status },
      newValue: { status: statusId },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Erreur mise à jour statut producteur:", error);
    return { success: false, error: "Impossible de mettre à jour le statut." };
  }
}

export async function assignProducerLocation(producerId: string, locationId: string) {
  if (!producerId || !locationId) return { success: false, error: "ID requis" };

  try {

    const [updated] = await db.update(schema.producers)
      .set({ zoneId: locationId })
      .where(eq(schema.producers.id, producerId))
      .returning();

    if (!updated) return { success: false, error: "Producteur introuvable" };

    const userId = await getUserIdFromSession();
    
    await audit({
      action: 'ASSIGN_PRODUCER_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Producer',
      entityId: producerId,
      // newValue est déjà dans 'updated'
      newValue: { zoneId: updated.zoneId }, 
    });

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: "Erreur technique" };
  }
}
// ╔══════════════════════════════════════════════╗
// ║  STOCKS / PRODUITS ADMIN                     ║
// ╚══════════════════════════════════════════════╝

export async function getAdminProducts() {
  try {
    // Fetch products with producer relation
    interface ProductWithProducer {
      id: string;
      shortCode: string | null;
      name: string;
      categoryLabel: string;
      price: number;
      unit: string;
      quantityForSale: number;
      createdAt: Date;
      updatedAt: Date;
      producer: {
        businessName: string | null;
        zone: { name: string } | null;
      } | null;
    }

    const productsRaw = await db.query.products.findMany({
      with: {
        producer: {
          columns: { businessName: true },
          with: { 
            zone: { 
              columns: { name: true } 
            } 
          },
        },
      },
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    }) as ProductWithProducer[];

    // Count order items per product
    const orderItemCounts = await db
      .select({ productId: schema.orderItems.productId, count: count() })
      .from(schema.orderItems)
      .groupBy(schema.orderItems.productId);

    const orderItemCountMap = new Map(orderItemCounts.map(r => [r.productId, Number(r.count)]));

    interface AdminProduct {
      id: string;
      shortCode: string;
      name: string;
      categoryLabel: string;
      price: number;
      unit: string;
      quantityForSale: number;
      producerName: string;
      location: string;
      totalOrders: number;
      createdAt: string;
      updatedAt: string;
    }

    interface AdminProductsResponse {
      success: true;
      data: AdminProduct[];
    }

    const formattedProducts: AdminProduct[] = productsRaw.map((p: ProductWithProducer): AdminProduct => ({
      id: p.id,
      shortCode: p.shortCode || '',
      name: p.name,
      categoryLabel: p.categoryLabel,
      price: p.price,
      unit: p.unit,
      quantityForSale: p.quantityForSale,
      producerName: p.producer?.businessName || 'Inconnu',
      location: p.producer?.zone?.name || 'Non assigné',
      totalOrders: orderItemCountMap.get(p.id),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: formattedProducts
    } as AdminProductsResponse;
  } catch (error) {
    console.error("Erreur chargement produits admin:", error);
    return { success: false, error: "Impossible de charger les produits." };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  VALIDATIONS (PENDING)                       ║
// ╚════
// 
export async function getAdminValidations() {
  try {
    // 1. Récupération des producteurs en attente avec leurs relations
    const pendingProducers = await db.query.producers.findMany({
      where: eq(schema.producers.status, 'PENDING'),
      with: {
        user: { 
          columns: { 
            name: true, 
            email: true, 
            phone: true, 
            createdAt: true 
          } 
        },
        zone: { 
          columns: { 
            name: true 
          } 
        },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    // 2. Formatage des données avec protection contre les valeurs nulles
    const validations = pendingProducers.map((p) => {
      // On prépare des fallback pour éviter les erreurs de lecture
      const userName = p.user?.name || 'Utilisateur sans nom';
      const userEmail = p.user?.email || 'Email non renseigné';
      const userPhone = p.user?.phone || 'Pas de numéro';
      const zoneName = p.zone?.name || 'Zone non définie';

      return {
        id: p.id,
        entityId: p.id,
        type: 'PRODUCER' as const, // Match avec ton type TabKey côté client
        title: p.businessName || userName,
        details: `${userEmail} • ${zoneName}`, // Ajout du champ details attendu par le client
        name: p.businessName || userName,     // Ajout du champ name attendu par le client
        producerName: `${userEmail} • ${zoneName}`,
        submissionDate: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        date: p.createdAt ? p.createdAt.toLocaleDateString('fr-FR') : 'Date inconnue', // Pour l'affichage direct
        priority: 'high' as const,
        status: 'PENDING' as const,
        metadata: {
          phone: userPhone,
          riskLevel: 'safe' as const,
        }
      };
    });

    // Optionnel: Tu pourrais aussi fetch les produits en attente ici 
    // et les concaténer à la liste 'validations'

    return { 
      success: true, 
      data: validations 
    };

  } catch (error) {
    // On log l'erreur réelle pour le debug mais on renvoie un message propre
    console.error("DÉTAIL ERREUR VALIDATIONS:", error);
    return { 
      success: false, 
      error: "Erreur lors de la récupération des dossiers de validation." 
    };
  }
}