import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, eq, lte } from 'drizzle-orm';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { resolveBuyerProfileId } from '@/features/buyer/services/buyerProfiles.service';
import { runOrderStatusHooks } from '@/features/orders/services/order-hooks';

export type BuyerPreorder = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  quantity: number;
  unitPrice: number;
  expectedFulfillmentDate: Date | null;
  preorderConvertedAt: Date | null;
  createdAt: Date;
  marketOffer: {
    id: string;
    productLabel: string;
    estimatedAvailableAt: Date | null;
  } | null;
};

export async function getBuyerPreorders(userId: string): Promise<ApiResult<BuyerPreorder[]>> {
  try {
    if (!userId) return fail('AUTH_REQUIRED');

    const buyerProfileId = await resolveBuyerProfileId(userId);
    if (!buyerProfileId) return ok([]);

    const rows = await db.query.orders.findMany({
      where: and(eq(schema.orders.buyerId, buyerProfileId), eq(schema.orders.orderType, 'PREORDER')),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      columns: {
        id: true,
        status: true,
        totalAmount: true,
        currency: true,
        expectedFulfillmentDate: true,
        preorderConvertedAt: true,
        createdAt: true,
      },
      with: {
        marketOffer: {
          columns: { id: true, productLabel: true, estimatedAvailableAt: true },
        },
        items: {
          columns: { id: true, quantity: true, priceAtSale: true },
          limit: 1,
        },
      },
    });

    return ok(
      rows.map((r) => ({
        id: r.id,
        status: r.status,
        totalAmount: Number(r.totalAmount),
        currency: r.currency,
        quantity: Number(r.items?.[0]?.quantity ?? 0),
        unitPrice: Number(r.items?.[0]?.priceAtSale ?? 0),
        expectedFulfillmentDate: r.expectedFulfillmentDate ?? null,
        preorderConvertedAt: r.preorderConvertedAt ?? null,
        createdAt: r.createdAt,
        marketOffer: r.marketOffer
          ? {
              id: r.marketOffer.id,
              productLabel: r.marketOffer.productLabel,
              estimatedAvailableAt: r.marketOffer.estimatedAvailableAt ?? null,
            }
          : null,
      })),
    );
  } catch (err) {
    return fail(errorMessage(err));
  }
}

/**
 * Conversion automatique des précommandes arrivées à maturité.
 * Pour chaque offre publique dont la date de disponibilité est atteinte,
 * les commandes PREORDER non converties passent en CONFIRMED et déclenchent
 * le pipeline standard (livraison + notification).
 */
export async function convertMaturedPreorders(now: Date = new Date()): Promise<ApiResult<{ converted: number }>> {
  try {
    const maturedOffers = await db.query.marketOffers.findMany({
      where: and(
        eq(schema.marketOffers.preorderEnabled, true),
        lte(schema.marketOffers.estimatedAvailableAt, now),
      ),
      columns: { id: true },
    });
    if (maturedOffers.length === 0) return ok({ converted: 0 });

    const offerIds = maturedOffers.map((o) => o.id);

    const pending = await db.query.orders.findMany({
      where: and(eq(schema.orders.orderType, 'PREORDER'), eq(schema.orders.status, 'PREORDER')),
      columns: { id: true, marketOfferId: true },
    });

    const toConvert = pending.filter((o) => o.marketOfferId && offerIds.includes(o.marketOfferId));
    if (toConvert.length === 0) return ok({ converted: 0 });

    let converted = 0;
    for (const order of toConvert) {
      await db
        .update(schema.orders)
        .set({ status: 'CONFIRMED', preorderConvertedAt: now })
        .where(eq(schema.orders.id, order.id));
      await runOrderStatusHooks(order.id, 'CONFIRMED');
      converted += 1;
    }

    return ok({ converted });
  } catch (err) {
    return fail(errorMessage(err));
  }
}
