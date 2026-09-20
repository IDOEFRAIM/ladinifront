import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { validateMinimumOrderQuantity } from '@/lib/orderPolicy';
import { UpdatePreorderSchema, CancelPreorderSchema, UpdatePreorderInput, CancelPreorderInput } from '@/features/orders/services/preorder.schemas';
import { freezeDatePassed, loadPreorderForBuyer } from '@/features/orders/services/preorder-helpers';

export async function updatePreorderQuantity(
  userId: string,
  input: UpdatePreorderInput,
): Promise<ApiResult<{ quantity: number }>> {
  try {
    const parsed = UpdatePreorderSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(', '));
    if (!userId) return fail('AUTH_REQUIRED');

    const order = await loadPreorderForBuyer(parsed.data.orderId, userId);
    if (!order) return fail('ORDER_NOT_FOUND');
    if (order.status !== 'PREORDER' || order.preorderConvertedAt) return fail('ORDER_LOCKED');
    if (freezeDatePassed(order.marketOffer?.estimatedAvailableAt ?? null)) return fail('MODIFICATION_WINDOW_CLOSED');

    // `orderItems.quantity`/`marketOffers.reservedQuantity`/`availableQuantity`
    // sont des colonnes `numeric` -> `string` côté drizzle ; converties ici,
    // une seule fois, jamais comparées/additionnées à l'état brut.
    const currentQty = Number(order.items![0].quantity);
    const newQty = parsed.data.quantity;
    if (newQty === currentQty) return ok({ quantity: currentQty });

    const offer = order.marketOffer!;
    const newReserved = Number(offer.reservedQuantity ?? 0) - currentQty + newQty;
    if (newReserved > Number(offer.availableQuantity ?? 0)) return fail('INSUFFICIENT_FUTURE_QUANTITY');

    // Un buyer réduisant sa précommande ne doit pas pouvoir passer sous le
    // seuil minimum de la plateforme — même règle qu'à la création.
    if (offer.subCategoryId) {
      const sub = await db.query.subCategories.findFirst({
        where: eq(schema.subCategories.id, offer.subCategoryId),
        columns: { minimumOrderQuantity: true, minimumOrderUnit: true },
      });
      const minCheck = validateMinimumOrderQuantity({
        minimumOrderQuantity: sub?.minimumOrderQuantity ?? null,
        minimumOrderUnit: sub?.minimumOrderUnit ?? null,
        totalQuantity: newQty,
        totalUnit: offer.unit,
      });
      if (!minCheck.passed) return fail('BELOW_MINIMUM_ORDER_QUANTITY');
    }

    const unitPrice = Number(order.items![0].priceAtSale);
    const newTotal = Number((unitPrice * newQty).toFixed(2));

    await db.transaction(async (tx) => {
      await tx.update(schema.orderItems).set({ quantity: String(newQty) }).where(eq(schema.orderItems.orderId, order.id));
      await tx.update(schema.orders).set({ totalAmount: String(newTotal) }).where(eq(schema.orders.id, order.id));
      await tx
        .update(schema.marketOffers)
        .set({ reservedQuantity: sql`${schema.marketOffers.reservedQuantity} - ${currentQty} + ${newQty}` })
        .where(eq(schema.marketOffers.id, offer.id));
    });

    return ok({ quantity: newQty });
  } catch (err) {
    return fail(errorMessage(err));
  }
}

export async function cancelPreorder(
  userId: string,
  input: CancelPreorderInput,
): Promise<ApiResult<{ cancelled: boolean }>> {
  try {
    const parsed = CancelPreorderSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(', '));
    if (!userId) return fail('AUTH_REQUIRED');

    const order = await loadPreorderForBuyer(parsed.data.orderId, userId);
    if (!order) return fail('ORDER_NOT_FOUND');
    if (order.status !== 'PREORDER' || order.preorderConvertedAt) return fail('ORDER_LOCKED');
    if (freezeDatePassed(order.marketOffer?.estimatedAvailableAt ?? null)) return fail('MODIFICATION_WINDOW_CLOSED');

    const qty = order.items![0].quantity;

    await db.transaction(async (tx) => {
      await tx.update(schema.orders).set({ status: 'CANCELLED' }).where(eq(schema.orders.id, order.id));
      await tx
        .update(schema.marketOffers)
        .set({ reservedQuantity: sql`${schema.marketOffers.reservedQuantity} - ${qty}` })
        .where(eq(schema.marketOffers.id, order.marketOfferId!));
    });

    return ok({ cancelled: true });
  } catch (err) {
    return fail(errorMessage(err));
  }
}
