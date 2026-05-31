import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, eq, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { ok, fail, errorMessage, type ApiResult } from '@/lib/api-result';
import { resolveBuyerProfileId } from '@/services/buyerProfiles.service';
import { runOrderStatusHooks } from '@/services/order.hooks';

const CreatePreorderSchema = z.object({
  cropCycleId: z.string().uuid(),
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

async function resolveCycleProductId(
  tx: TxClient,
  cycle: {
    id: string;
    cropType: string;
    subCategoryId: string | null;
    pricePerUnit: number | null;
    unit: string;
    availableQuantity: number;
    producerId: string;
  },
): Promise<string> {
  const shortCode = `PRE-${cycle.id}`;

  const existing = await tx.query.products.findFirst({
    where: eq(schema.products.shortCode, shortCode),
    columns: { id: true },
  });
  if (existing?.id) return existing.id;

  const [created] = await tx
    .insert(schema.products)
    .values({
      shortCode,
      name: cycle.cropType,
      categoryLabel: cycle.cropType,
      subCategoryId: cycle.subCategoryId ?? null,
      price: cycle.pricePerUnit ?? 0,
      unit: cycle.unit,
      quantityForSale: cycle.availableQuantity,
      isAvailable: false,
      producerId: cycle.producerId,
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
      cropCycleId: true,
      totalAmount: true,
      currency: true,
      expectedFulfillmentDate: true,
      preorderConvertedAt: true,
    },
    with: {
      items: { columns: { id: true, quantity: true, priceAtSale: true }, limit: 1 },
      cropCycle: {
        columns: { id: true, estimatedAvailableAt: true, availableQuantity: true, reservedQuantity: true },
      },
    },
  });

  if (!order || !order.cropCycle || !order.items?.[0]) return null;
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
    if (freezeDatePassed(order.cropCycle?.estimatedAvailableAt ?? null)) return fail('MODIFICATION_WINDOW_CLOSED');

    const currentQty = order.items![0].quantity;
    const newQty = parsed.data.quantity;
    if (newQty === currentQty) return ok({ quantity: currentQty });

    const cycle = order.cropCycle!;
    const newReserved = (cycle.reservedQuantity ?? 0) - currentQty + newQty;
    if (newReserved > (cycle.availableQuantity ?? 0)) return fail('INSUFFICIENT_FUTURE_QUANTITY');

    const unitPrice = order.items![0].priceAtSale;
    const newTotal = Number((unitPrice * newQty).toFixed(2));

    await db.transaction(async (tx) => {
      await tx.update(schema.orderItems).set({ quantity: newQty }).where(eq(schema.orderItems.orderId, order.id));
      await tx.update(schema.orders).set({ totalAmount: newTotal }).where(eq(schema.orders.id, order.id));
      await tx
        .update(schema.cropCycles)
        .set({ reservedQuantity: sql`${schema.cropCycles.reservedQuantity} - ${currentQty} + ${newQty}` })
        .where(eq(schema.cropCycles.id, cycle.id));
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
    if (freezeDatePassed(order.cropCycle?.estimatedAvailableAt ?? null)) return fail('MODIFICATION_WINDOW_CLOSED');

    const qty = order.items![0].quantity;

    await db.transaction(async (tx) => {
      await tx.update(schema.orders).set({ status: 'CANCELLED' }).where(eq(schema.orders.id, order.id));
      await tx
        .update(schema.cropCycles)
        .set({ reservedQuantity: sql`${schema.cropCycles.reservedQuantity} - ${qty}` })
        .where(eq(schema.cropCycles.id, order.cropCycleId!));
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

    const cycle = await db.query.cropCycles.findFirst({
      where: eq(schema.cropCycles.id, data.cropCycleId),
      with: { farm: { columns: { producerId: true } } },
    });
    if (!cycle) return fail('CYCLE_NOT_FOUND');
    if (!cycle.isPublic || !cycle.preorderEnabled) return fail('PREORDER_NOT_AVAILABLE');
    if (cycle.pricePerUnit === null) return fail('PREORDER_PRICE_NOT_SET');

    const producerId = cycle.farm?.producerId;
    if (!producerId) return fail('PRODUCER_NOT_RESOLVED');

    const remaining = cycle.availableQuantity - cycle.reservedQuantity;
    if (data.quantity > remaining) return fail('INSUFFICIENT_FUTURE_QUANTITY');

    const unitPrice = cycle.pricePerUnit;
    const subtotal = Number((unitPrice * data.quantity).toFixed(2));

    const orderId = await db.transaction(async (tx) => {
      const buyerProfileId = await resolveBuyerProfileId(userId, { tx });
      if (!buyerProfileId) throw new Error('BUYER_PROFILE_REQUIRED');

      const productId = await resolveCycleProductId(tx, {
        id: cycle.id,
        cropType: cycle.cropType,
        subCategoryId: cycle.subCategoryId,
        pricePerUnit: cycle.pricePerUnit,
        unit: cycle.unit,
        availableQuantity: cycle.availableQuantity,
        producerId,
      });

      const [order] = await tx
        .insert(schema.orders)
        .values({
          buyerId: buyerProfileId,
          orderType: 'PREORDER',
          cropCycleId: cycle.id,
          status: 'PREORDER',
          paymentMethod: data.paymentMethod,
          paymentStatus: 'PENDING',
          customerName: data.customerName ?? null,
          customerPhone: data.customerPhone ?? null,
          deliveryDesc: data.deliveryDesc ?? null,
          city: data.city ?? null,
          source: 'APP',
          currency: 'XOF',
          subtotal,
          taxAmount: 0,
          deliveryFee: 0,
          totalAmount: subtotal,
          expectedFulfillmentDate: cycle.estimatedAvailableAt ?? null,
        })
        .returning({ id: schema.orders.id });

      if (!order) throw new Error('ORDER_CREATE_FAILED');

      await tx.insert(schema.orderItems).values({
        orderId: order.id,
        productId,
        quantity: data.quantity,
        priceAtSale: unitPrice,
      });

      await tx
        .update(schema.cropCycles)
        .set({ reservedQuantity: sql`${schema.cropCycles.reservedQuantity} + ${data.quantity}` })
        .where(eq(schema.cropCycles.id, cycle.id));

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
  cropCycle: {
    id: string;
    cropType: string;
    growthStage: string | null;
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
        cropCycle: {
          columns: { id: true, cropType: true, growthStage: true, estimatedAvailableAt: true },
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
        totalAmount: r.totalAmount,
        currency: r.currency,
        quantity: r.items?.[0]?.quantity ?? 0,
        unitPrice: r.items?.[0]?.priceAtSale ?? 0,
        expectedFulfillmentDate: r.expectedFulfillmentDate ?? null,
        preorderConvertedAt: r.preorderConvertedAt ?? null,
        createdAt: r.createdAt,
        cropCycle: r.cropCycle
          ? {
              id: r.cropCycle.id,
              cropType: r.cropCycle.cropType,
              growthStage: r.cropCycle.growthStage ?? null,
              estimatedAvailableAt: r.cropCycle.estimatedAvailableAt ?? null,
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
 * Pour chaque cycle public dont la date de disponibilité est atteinte,
 * les commandes PREORDER non converties passent en CONFIRMED et déclenchent
 * le pipeline standard (livraison + notification).
 */
export async function convertMaturedPreorders(now: Date = new Date()): Promise<ApiResult<{ converted: number }>> {
  try {
    const maturedCycles = await db.query.cropCycles.findMany({
      where: and(
        eq(schema.cropCycles.preorderEnabled, true),
        lte(schema.cropCycles.estimatedAvailableAt, now),
      ),
      columns: { id: true },
    });
    if (maturedCycles.length === 0) return ok({ converted: 0 });

    const cycleIds = maturedCycles.map((c) => c.id);

    const pending = await db.query.orders.findMany({
      where: and(eq(schema.orders.orderType, 'PREORDER'), eq(schema.orders.status, 'PREORDER')),
      columns: { id: true, cropCycleId: true },
    });

    const toConvert = pending.filter((o) => o.cropCycleId && cycleIds.includes(o.cropCycleId));
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
