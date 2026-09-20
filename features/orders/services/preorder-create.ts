import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { resolveBuyerProfileId } from '@/features/buyer/services/buyerProfiles.service';
import { validateMinimumOrderQuantity } from '@/lib/orderPolicy';
import { CreatePreorderSchema, CreatePreorderInput } from '@/features/orders/services/preorder.schemas';
import { resolveOfferProductId } from '@/features/orders/services/preorder-helpers';

export async function createPreorder(
  userId: string,
  input: CreatePreorderInput,
): Promise<ApiResult<{ orderId: string }>> {
  try {
    if (!userId) return fail('AUTH_REQUIRED');

    const parsed = CreatePreorderSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const data = parsed.data;

    const offer = await db.query.marketOffers.findFirst({
      where: eq(schema.marketOffers.id, data.marketOfferId),
    });
    if (!offer) return fail('CYCLE_NOT_FOUND');
    if (!offer.isPublic || !offer.preorderEnabled) return fail('PREORDER_NOT_AVAILABLE');
    if (offer.pricePerUnit === null) return fail('PREORDER_PRICE_NOT_SET');

    const producerId = offer.producerId;
    if (!producerId) return fail('PRODUCER_NOT_RESOLVED');

    const availableQuantity = Number(offer.availableQuantity);
    const reservedQuantity = Number(offer.reservedQuantity);
    const remaining = availableQuantity - reservedQuantity;
    if (data.quantity > remaining) return fail('INSUFFICIENT_FUTURE_QUANTITY');

    // Seuil minimum de commande — policy PLATEFORME par type de produit (voir
    // lib/orderPolicy.ts). S'applique aux précommandes de production future
    // exactement comme aux achats directs — même règle, même source de vérité.
    if (offer.subCategoryId) {
      const sub = await db.query.subCategories.findFirst({
        where: eq(schema.subCategories.id, offer.subCategoryId),
        columns: { minimumOrderQuantity: true, minimumOrderUnit: true },
      });
      const minCheck = validateMinimumOrderQuantity({
        minimumOrderQuantity: sub?.minimumOrderQuantity ?? null,
        minimumOrderUnit: sub?.minimumOrderUnit ?? null,
        totalQuantity: data.quantity,
        totalUnit: offer.unit,
      });
      if (!minCheck.passed) return fail('BELOW_MINIMUM_ORDER_QUANTITY');
    }

    const unitPrice = Number(offer.pricePerUnit);
    const subtotal = Number((unitPrice * data.quantity).toFixed(2));

    const orderId = await db.transaction(async (tx) => {
      const buyerProfileId = await resolveBuyerProfileId(userId, { tx });
      if (!buyerProfileId) throw new Error('BUYER_PROFILE_REQUIRED');

      const productId = await resolveOfferProductId(tx, {
        id: offer.id,
        productLabel: offer.productLabel,
        subCategoryId: offer.subCategoryId,
        pricePerUnit: unitPrice,
        unit: offer.unit,
        availableQuantity,
        producerId,
      });

      const [order] = await tx
        .insert(schema.orders)
        .values({
          buyerId: buyerProfileId,
          orderType: 'PREORDER',
          marketOfferId: offer.id,
          status: 'PREORDER',
          paymentMethod: data.paymentMethod,
          paymentStatus: 'PENDING',
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
          deliveryDesc: data.deliveryDesc ?? null,
          city: data.city ?? null,
          source: 'APP',
          currency: 'XOF',
          // Colonnes `numeric` -> `string` côté drizzle.
          subtotal: String(subtotal),
          taxAmount: '0',
          deliveryFee: '0',
          totalAmount: String(subtotal),
          expectedFulfillmentDate: offer.estimatedAvailableAt ?? null,
        })
        .returning({ id: schema.orders.id });

      if (!order) throw new Error('ORDER_CREATE_FAILED');

      await tx.insert(schema.orderItems).values({
        orderId: order.id,
        productId,
        quantity: String(data.quantity),
        priceAtSale: String(unitPrice),
      });

      await tx
        .update(schema.marketOffers)
        .set({ reservedQuantity: sql`${schema.marketOffers.reservedQuantity} + ${data.quantity}` })
        .where(eq(schema.marketOffers.id, offer.id));

      return order.id;
    });

    return ok({ orderId });
  } catch (err) {
    return fail(errorMessage(err));
  }
}
