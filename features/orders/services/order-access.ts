// Règle d'accès à une commande (pure + une requête) — utilisée par l'action getOrderDetails.
import { and, eq } from 'drizzle-orm';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import type { AccessContext } from '@/lib/access-context';

interface OrderOwnership {
  id: string;
  buyerId: string | null;
  organizationId: string | null;
}

async function orderInvolvesProducer(orderId: string, producerId: string): Promise<boolean> {
  const rows = await db
    .select({ id: schema.orderItems.id })
    .from(schema.orderItems)
    .innerJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    .where(and(eq(schema.orderItems.orderId, orderId), eq(schema.products.producerId, producerId)))
    .limit(1);
  return rows.length > 0;
}

/** Acheteur de la commande, admin plateforme, membre de l'organisation ou producteur concerné. */
export async function canAccessOrder(ctx: AccessContext, order: OrderOwnership): Promise<boolean> {
  if (ctx.isGlobalAdmin) return true;
  if (order.buyerId && order.buyerId === ctx.userId) return true;
  if (order.organizationId && ctx.organizationIds.includes(order.organizationId)) return true;
  if (ctx.producerId) return orderInvolvesProducer(order.id, ctx.producerId);
  return false;
}
