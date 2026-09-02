import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { resolveBuyerProfileId } from '@/services/buyerProfiles.service';
import { runOrderStatusHooks } from '@/services/order.hooks';
import { validateMinimumOrderQuantity } from '@/lib/orderPolicy';

// (2026-09-02) `crop_cycles` -> `market_offers` (schéma dégraissé, voir
// src/db/schema/marketplace.ts). `orders.cropCycleId` -> `orders.marketOfferId`,
// `cropType` -> `productLabel`. `growthStage` n'existe plus (colonne
// supprimée) — retiré des types/retours ci-dessous.

const CreatePreorderSchema = z.object({
  marketOfferId: z.string().uuid(),
  quantity: z.number().positive(),
  customerName: z.string().min(1).optional(),
  customerPhone: z.string().min(1).optional(),
  deliveryDesc: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  paymentMethod: z.string().min(1).default('CASH'),
});

const UpdatePreorderSchema = z.object({
  orderId: z.string().uuid(),
  quantity: z.number().positive(),
});

const CancelPreorderSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreatePreorderInput = z.input<typeof CreatePreorderSchema>;
export type UpdatePreorderInput = z.input<typeof UpdatePreorderSchema>;
export type CancelPreorderInput = z.input<typeof CancelPreorderSchema>;

type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MODIFICATION_FREEZE_DAYS = 30;
const freezeDatePassed = (estimatedAt: Date | null) => {
  if (!estimatedAt) return false;
  const freezeDate = new Date(estimatedAt.getTime());
  freezeDate.setDate(freezeDate.getDate() - MODIFICATION_FREEZE_DAYS);
  return new Date() > freezeDate;
};

async function resolveOfferProductId(
  tx: TxClient,
  offer: {
    id: string;
    productLabel: string;
    subCategoryId: string | null;
    pricePerUnit: number | null;
    unit: string;
    availableQuantity: number;
    producerId: string;
  },
): Promise<string> {
  const shortCode = `PRE-${offer.id}`;

  const existing = await tx.query.products.findFirst({
    where: eq(schema.products.shortCode, shortCode),
    columns: { id: true },
  });
  if (existing?.id) return existing.id;

  const [created] = await tx
    .insert(schema.products)
    .values({
      shortCode,
      name: offer.productLabel,
      categoryLabel: offer.productLabel,
      subCategoryId: offer.subCategoryId ?? null,
      // `price`/`quantityForSale` sont des colonnes `numeric` (drizzle les
      // représente en `string` côté JS pour ne pas perdre de précision) —
      // jamais des `number` bruts.
      price: String(offer.pricePerUnit ?? 0),
      unit: offer.unit,
      quantityForSale: String(offer.availableQuantity),
      isAvailable: false,
      producerId: offer.producerId,
    })
    .returning({ id: schema.products.id });

  if (!created) throw new Error('PREORDER_PRODUCT_CREATE_FAILED');
  return created.id;
}

// ── Update / Cancel Preorders ───────────────────────────────────────────

async function loadPreorderForBuyer(orderId: string, userId: string) {
  const buyerProfileId = await resolveBuyerProfileId(userId);
  if (!buyerProfileId) return null;

  const order = await db.query.orders.findFirst({
    where: and(
      eq(schema.orders.id, orderId),
      eq(schema.orders.buyerId, buyerProfileId),
      eq(schema.orders.orderType, 'PREORDER'),
    ),
    columns: {
      id: true,
      status: true,
      marketOfferId: true,
      totalAmount: true,
      currency: true,
      expectedFulfillmentDate: true,
      preorderConvertedAt: true,
    },
    with: {
      items: { columns: { id: true, quantity: true, priceAtSale: true }, limit: 1 },
      marketOffer: {
        columns: {
          id: true, estimatedAvailableAt: true, availableQuantity: true, reservedQuantity: true,
          subCategoryId: true, unit: true,
        },
      },
    },
  });

  if (!order || !order.marketOffer || !order.items?.[0]) return null;
  return order;
}

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
