import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count, desc } from 'drizzle-orm';
import { audit } from '@/lib/audit';
import getUserIdFromSession from '@/lib/get-userId';
import { assertAdmin } from '@/features/admin/services/admin-guard';

export async function getAdminProducers() {
  try {
    await assertAdmin();
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
    const productToProducerMap = new Map(productToProducer.map(p => [p.id, p.producerId]));
    for (const po of producerOrders) {
      const pid = productToProducerMap.get(po.productId);
      if (pid) {
        orderCountByProducer.set(pid, (orderCountByProducer.get(pid) ?? 0) + Number(po.count));
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
      productsCount: prodCountMap.get(p.id) ?? 0,
      farmsCount: farmCountMap.get(p.id) ?? 0,
      totalOrders: orderCountByProducer.get(p.id) ?? 0,
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
export const ALLOWED_PRODUCER_STATUSES = ['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];

export async function updateProducerStatus(producerId: string, statusId: string) {
  if (!producerId) return { success: false, error: "ID requis" };
  const upper = String(statusId).toUpperCase();
  if (!ALLOWED_PRODUCER_STATUSES.includes(upper)) {
    return { success: false, error: `Statut invalide. Valeurs acceptées : ${ALLOWED_PRODUCER_STATUSES.join(', ')}` };
  }

  try {
    await assertAdmin();
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
    await assertAdmin();

    const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, locationId), columns: { id: true } });
    if (!zone) return { success: false, error: "Zone introuvable" };

    const oldProducer = await db.query.producers.findFirst({
      where: eq(schema.producers.id, producerId),
      columns: { zoneId: true },
    });

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
      oldValue: { zoneId: oldProducer?.zoneId },
      newValue: { zoneId: updated.zoneId }, 
    });

    return { success: true, data: updated };
  } catch (error) {
    console.error("Erreur assignation zone producteur:", error);
    return { success: false, error: "Erreur technique" };
  }
}
// ╔══════════════════════════════════════════════╗
// ║  STOCKS / PRODUITS ADMIN                     ║
// ╚══════════════════════════════════════════════╝
