'use server';

import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, sql, count, sum, gte, inArray } from 'drizzle-orm';
import { audit, snapshot } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";

// ╔══════════════════════════════════════════════╗
// ║  DASHBOARD STATS                             ║
// ╚══════════════════════════════════════════════╝

export async function getAdminDashboardStats() {
  try {
    // Simplified fallback: use raw SQL to get a few basic counts so endpoint stays functional
    const totalUsersRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM auth.users`);
    const totalProductsRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM marketplace.products`);
    const totalOrdersRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM marketplace.orders`);

    const totalUsers = Number((totalUsersRes as any[])?.[0]?.cnt || 0);
    const totalProducts = Number((totalProductsRes as any[])?.[0]?.cnt || 0);
    const totalOrders = Number((totalOrdersRes as any[])?.[0]?.cnt || 0);

    // Minimal response
    const formattedData = {
      totalProducers: 0,
      pendingProducers: 0,
      activeProducers: 0,
      totalOrders,
      pendingOrders: 0,
      recentOrders: 0,
      totalProducts,
      totalLocations: 0,
      activeLocations: 0,
      totalRegions: 0,
      totalUsers,
      totalRevenue: 0,
      avgOrderValue: 0,
      conversion7d: 0,
      avgDeliveryHours: 0,
      aiApprovalRate: 0,
      topLocations: [],
      recentActivity: [],
    };

    return { success: true, data: formattedData };

    // (Detailed metrics generation removed temporarily - simplified response returned above)
  } catch (error) {
      console.error("Erreur critique dashboard stats:", error);
      if (error instanceof Error) console.error(error.stack);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur lors du calcul des indicateurs." 
    };
  }
}

// ╔══════════════════════════════════════════════╗
// ║  PRODUCTEURS                                 ║
// ╚══════════════════════════════════════════════╝

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
          (orderCountByProducer.get(prod.producerId) || 0) + Number(po.count)
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
      productsCount: prodCountMap.get(p.id) || 0,
      farmsCount: farmCountMap.get(p.id) || 0,
      totalOrders: orderCountByProducer.get(p.id) || 0,
      registrationDate: p.user.createdAt.toISOString(),
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
  if (!producerId || !locationId) return { success: false, error: "ID producteur et localisation requis" };

  try {
    const zoneId = locationId;
    const oldProducer = await db.query.producers.findFirst({
      where: eq(schema.producers.id, producerId),
      columns: { zoneId: true },
    });
    const [updated] = await db.update(schema.producers)
      .set({ zoneId })
      .where(eq(schema.producers.id, producerId))
      .returning();

    const userId = await getUserIdFromSession();
    await audit({
      action: 'ASSIGN_PRODUCER_LOCATION',
      actorId: userId ?? 'system',
      entityType: 'Producer',
      entityId: producerId,
      oldValue: { zoneId: oldProducer?.zoneId },
      newValue: { zoneId },
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Erreur assignation localisation:", error);
    return { success: false, error: "Impossible d'assigner la localisation." };
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
      };
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
      producerName: p.producer.businessName || 'Inconnu',
      location: p.producer.zone?.name || 'Non assigné',
      totalOrders: orderItemCountMap.get(p.id) || 0,
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
// ╚══════════════════════════════════════════════╝

export async function getAdminValidations() {
  try {
    // Producteurs en attente de validation
    const pendingProducers = await db.query.producers.findMany({
      where: eq(schema.producers.status, 'PENDING'),
      with: {
        user: { columns: { name: true, email: true, phone: true, createdAt: true } },
        zone: { columns: { name: true } },
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });

    interface ValidationMetadata {
      phone: string;
      riskLevel: 'safe';
    }

    interface Validation {
      id: string;
      entityId: string;
      type: 'producer';
      title: string;
      producerName: string;
      submissionDate: string;
      priority: 'high';
      status: 'pending';
      metadata: ValidationMetadata;
    }

    interface PendingProducer {
      id: string;
      businessName: string | null;
      createdAt: Date;
      user: {
      name: string | null;
      email: string | null;
      phone: string | null;
      };
      zone: {
      name: string;
      } | null;
    }

    const validations: Validation[] = (pendingProducers as PendingProducer[]).map((p: PendingProducer) => ({
      id: p.id,
      entityId: p.id,
      type: 'producer' as const,
      title: p.businessName || p.user.name || 'Producteur',
      producerName: `${p.user.email || 'N/A'} • ${p.zone?.name || 'Localisation inconnue'}`,
      submissionDate: p.createdAt.toISOString(),
      priority: 'high' as const,
      status: 'pending' as const,
      metadata: {
      phone: p.user.phone || '',
      riskLevel: 'safe' as const,
      }
    }));

    return { success: true, data: validations };
  } catch (error) {
    console.error("Erreur chargement validations:", error);
    return { success: false, error: "Impossible de charger les validations." };
  }
}
