'use server';

import { prisma } from "@/lib/prisma";
import { audit, snapshot } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";

// ╔══════════════════════════════════════════════╗
// ║  DASHBOARD STATS                             ║
// ╚══════════════════════════════════════════════╝

export async function getAdminDashboardStats() {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalProducers,
      pendingProducers,
      activeProducers,
      orderCounts,
      pendingOrdersCount,
      recentOrdersCount,
      totalProducts,
      totalLocations,
      activeLocationsCount,
      totalRegions,
      totalUsers,
      revenueAgg,
      topLocationsRaw,
      recentOrdersRaw,
      agentActionCounts,
    ] = await Promise.all([
      prisma.producer.count(),
      prisma.producer.count({ where: { status: 'PENDING' } }),
      prisma.producer.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { createdAt: { gte: last24h } } }),
      prisma.product.count(),
      prisma.zone.count(),
      prisma.zone.count({ where: { isActive: true } }),
      prisma.climaticRegion.count(),
      prisma.user.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.zone.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { producers: true, orders: true } },
          climaticRegion: { select: { name: true } }
        },
        orderBy: { orders: { _count: 'desc' } },
        take: 10
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          zone: { select: { name: true } },
          items: {
            take: 1,
            select: { 
              product: { 
                select: { 
                  name: true, 
                  producer: { select: { businessName: true } } 
                } 
              } 
            }
          }
        }
      }),
      prisma.agentAction.groupBy({
        by: ['status'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true }
      })
    ]);

    // --- Stats de Conversion (7 jours) ---
    const [totalOrders7d, converted7d] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: last7d } } }),
      prisma.order.count({
        where: {
          createdAt: { gte: last7d },
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
        }
      }),
    ]);
    
    const conversion7d = totalOrders7d > 0 ? (converted7d / totalOrders7d) : 0;

    // --- Revenus et Valeurs Moyennes ---
    const totalRevenue = Number(revenueAgg?._sum?.totalAmount || 0);
    const avgOrderValue = orderCounts > 0 ? totalRevenue / orderCounts : 0;

    // --- Temps de Livraison Moyen (Correction SQL PostgreSQL) ---
    // Note : Utilisation de "orders" (@@map) et "updatedAt" (nom réel en base)
    const avgDeliveryRes = await prisma.$queryRaw<{ avg_hours: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM (o."updatedAt" - o."createdAt")))/3600 as avg_hours
      FROM "orders" o
      WHERE o."status" = 'DELIVERED'
    `;
    const avgDeliveryHours = Number(avgDeliveryRes?.[0]?.avg_hours || 0);

    // --- AI Approval Rate ---
    const totalAgentActions = agentActionCounts.reduce((s: number, r: any) => s + (r._count?._all || 0), 0);
    const approvedActions = agentActionCounts.find((a: any) => a.status === 'APPROVED')?._count._all || 0;
    const aiApprovalRate = totalAgentActions > 0 ? (approvedActions / totalAgentActions) : 0;

    interface DashboardLocation {
      id: string;
      name: string;
      region: string | null;
      producers: number;
      orders: number;
    }

    interface DashboardActivity {
      id: string;
      customerName: string;
      amount: number;
      status: string;
      date: string;
      location: string | null;
      producerName: string;
    }

    interface DashboardStatsData {
      totalProducers: number;
      pendingProducers: number;
      activeProducers: number;
      totalOrders: number;
      pendingOrders: number;
      recentOrders: number;
      totalProducts: number;
      totalLocations: number;
      activeLocations: number;
      totalRegions: number;
      totalUsers: number;
      totalRevenue: number;
      avgOrderValue: number;
      conversion7d: number;
      avgDeliveryHours: number;
      aiApprovalRate: number;
      topLocations: DashboardLocation[];
      recentActivity: DashboardActivity[];
    }

    interface DashboardStatsResponse {
      success: true;
      data: DashboardStatsData;
    }

        interface TopLocation extends DashboardLocation {
          climaticRegion?: { name: string } | null;
          _count?: { producers: number; orders: number };
        }

        interface RecentOrder {
          id: string;
          customerName: string | null;
          totalAmount: number | null;
          status: string | null;
          createdAt: Date;
          zone: { name: string } | null;
          items: Array<{
          product: {
            name: string;
            producer: { businessName: string | null };
          };
          }>;
        }

        const formattedData: DashboardStatsData = {
          totalProducers,
          pendingProducers,
          activeProducers,
          totalOrders: orderCounts,
          pendingOrders: pendingOrdersCount,
          recentOrders: recentOrdersCount,
          totalProducts,
          totalLocations,
          activeLocations: activeLocationsCount,
          totalRegions,
          totalUsers,
          totalRevenue,
          avgOrderValue,
          conversion7d,
          avgDeliveryHours,
          aiApprovalRate,
          topLocations: (topLocationsRaw as any).map((z: any) => ({
          id: z.id,
          name: z.name,
          region: z.climaticRegion?.name || null,
          producers: z._count?.producers || 0,
          orders: z._count?.orders || 0,
          })),
          recentActivity: (recentOrdersRaw as RecentOrder[]).map(o => ({
          id: o.id,
          customerName: o.customerName || 'Client anonyme',
          amount: Number(o.totalAmount || 0),
          status: o.status || 'UNKNOWN',
          date: o.createdAt.toISOString(),
          location: o.zone?.name || null,
          producerName: o.items?.[0]?.product?.producer?.businessName || 'Multi-producteurs',
          })),
        };

        return {
          success: true,
          data: formattedData,
        } as DashboardStatsResponse;
  } catch (error) {
    console.error("Erreur critique dashboard stats:", error);
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
    const producers = await prisma.producer.findMany({
      include: {
        user: { select: { email: true, phone: true, createdAt: true } },
        zone: { select: { id: true, name: true } },
        _count: { select: { products: true, farms: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Compter les commandes par producteur via orderItems
    const producerOrders = await prisma.orderItem.groupBy({
      by: ['productId'],
      _count: { orderId: true },
    });

    const productToProducer = await prisma.product.findMany({
      select: { id: true, producerId: true }
    });

    const orderCountByProducer = new Map<string, number>();
    for (const po of producerOrders) {
      const prod = productToProducer.find((p: { id: string; producerId: string }) => p.id === po.productId);
      if (prod) {
        orderCountByProducer.set(
          prod.producerId,
          (orderCountByProducer.get(prod.producerId) || 0) + po._count.orderId
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

    const formattedProducers: AdminProducer[] = producers.map((p: typeof producers[number]): AdminProducer => ({
      id: p.id,
      businessName: p.businessName || 'Sans nom',
      status: p.status,
      email: p.user?.email || '',
      phone: p.user?.phone || '',
      zone: p.zone?.name || 'Non assigné',
      zoneId: p.zone?.id || null,
      productsCount: p._count.products,
      farmsCount: p._count.farms,
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
    const oldProducer = await prisma.producer.findUnique({ where: { id: producerId }, select: { status: true } });
    const updated = await prisma.producer.update({
      where: { id: producerId },
      data: { status: statusId as any }
    });

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
    const oldProducer = await prisma.producer.findUnique({ where: { id: producerId }, select: { zoneId: true } });
    const updated = await prisma.producer.update({
      where: { id: producerId },
      data: { zoneId }
    });

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
    const products = await prisma.product.findMany({
      include: {
        producer: { 
          select: { 
            businessName: true,
            zone: { select: { name: true } }
          } 
        },
        _count: { select: { orderItems: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

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

    const formattedProducts: AdminProduct[] = products.map((p: typeof products[number]): AdminProduct => ({
      id: p.id,
      shortCode: p.shortCode || '',
      name: p.name,
      categoryLabel: p.categoryLabel,
      price: p.price,
      unit: p.unit,
      quantityForSale: p.quantityForSale,
      producerName: p.producer.businessName || 'Inconnu',
      location: p.producer.zone?.name || 'Non assigné',
      totalOrders: p._count.orderItems,
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
    const pendingProducers = await prisma.producer.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { name: true, email: true, phone: true, createdAt: true } },
        zone: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
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
