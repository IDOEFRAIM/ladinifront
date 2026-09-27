import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { and, eq } from 'drizzle-orm';
import { resolveBuyerProfileId } from '@/features/buyer/services/buyerProfiles.service';

export type TxClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const MODIFICATION_FREEZE_DAYS = 30;

export const freezeDatePassed = (estimatedAt: Date | null) => {
  if (!estimatedAt) return false;
  const freezeDate = new Date(estimatedAt.getTime());
  freezeDate.setDate(freezeDate.getDate() - MODIFICATION_FREEZE_DAYS);
  return new Date() > freezeDate;
};

export async function resolveOfferProductId(
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

export async function loadPreorderForBuyer(orderId: string, userId: string) {
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
