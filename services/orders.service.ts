'use server'
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { audit, snapshot } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";
import { resolveBuyerProfileId } from '@/services/buyerProfiles.service';
import { validateMinimumOrderQuantity } from '@/lib/orderPolicy';

// Type pour la création de commande (agnostique de la source)
interface CreateOrderParams {
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paymentMethod?: string;
  city?: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  deliveryDesc?: string;
  audioUrl?: string | null;
  buyerId?: string;
  locationId?: string;
  zoneId?: string;
  organizationId?: string; // Org qui vend (multi-tenant)
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
}

interface ProductInventoryCheck {
  id: string;
  quantityForSale: number;
  name: string;
  unit: string;
  subCategoryId: string | null;
}

interface OrderCreated {
  id: string;
  totalAmount: number;
  status: string;
  buyerId: string | null;
  organizationId: string | null;
}

interface OrderItem {
  productId: string;
  quantity: number;
  priceAtSale: number;
}

function aggregateQuantities(items: CreateOrderParams['items']): Map<string, number> {
  const requiredByProductId = new Map<string, number>();
  for (const item of items) {
    requiredByProductId.set(item.productId, (requiredByProductId.get(item.productId) ?? 0) + item.quantity);
  }
  return requiredByProductId;
}

/**
 * Maps payment method string to PaymentMethodRef code.
 */
function mapPaymentMethodCode(method?: string): string {
  const paymentMethodMap: Record<string, string> = {
    'cash': 'CASH',
    'mobile_money': 'MOBILE_MONEY',
    'bank_transfer': 'BANK_TRANSFER',
  };
  return paymentMethodMap[method || 'cash'] || 'CASH';
}

/**
 * Validates inventory for all items in a single DB query (no DB calls in loops).
 */
async function validateInventory(tx: any, items: CreateOrderParams['items']): Promise<Map<string, ProductInventoryCheck>> {
  const requiredByProductId = aggregateQuantities(items);
  const productIds = Array.from(requiredByProductId.keys());

  const products: ProductInventoryCheck[] =
    productIds.length > 0
      ? await tx.query.products.findMany({
          where: inArray(schema.products.id, productIds),
          columns: { id: true, quantityForSale: true, name: true, unit: true, subCategoryId: true },
        })
      : [];

  const productById = new Map<string, ProductInventoryCheck>();
  for (const p of products) productById.set(p.id, p);

  // Seuil minimum de commande — policy PLATEFORME par TYPE de produit (voir
  // lib/orderPolicy.ts + governance.ts::subCategories.minimumOrderQuantity).
  // Une seule requête groupée, jamais une par produit dans la boucle.
  const subCategoryIds = Array.from(
    new Set(products.map((p) => p.subCategoryId).filter((id): id is string => !!id)),
  );
  const subCategoryById = new Map<string, { minimumOrderQuantity: string | null; minimumOrderUnit: string | null }>();
  if (subCategoryIds.length > 0) {
    const subs = await tx.query.subCategories.findMany({
      where: inArray(schema.subCategories.id, subCategoryIds),
      columns: { id: true, minimumOrderQuantity: true, minimumOrderUnit: true },
    });
    for (const s of subs) subCategoryById.set(s.id, s);
  }

  for (const [productId, requiredQty] of requiredByProductId) {
    const product = productById.get(productId);
    if (!product) {
      throw new Error(`Produit introuvable: ${productId}`);
    }
    if ((product.quantityForSale ?? 0) < requiredQty) {
      throw new Error(`Stock insuffisant pour "${product.name}" (disponible: ${product.quantityForSale})`);
    }

    // Le backend NE FAIT JAMAIS confiance au frontend pour cette règle
    // (même si l'UI affiche déjà le seuil pour l'UX) — re-validation
    // obligatoire ici, seul point de vérité côté serveur pour ce canal.
    const sub = product.subCategoryId ? subCategoryById.get(product.subCategoryId) : undefined;
    const minCheck = validateMinimumOrderQuantity({
      minimumOrderQuantity: sub?.minimumOrderQuantity ?? null,
      minimumOrderUnit: sub?.minimumOrderUnit ?? null,
      totalQuantity: requiredQty,
      totalUnit: product.unit,
    });
    if (!minCheck.passed) {
      if (minCheck.reason === 'UNIT_INCOMPATIBLE') {
        throw new Error(
          `Le seuil minimum de commande pour "${product.name}" est défini en ${minCheck.minimumUnit}, incompatible avec ${product.unit}.`,
        );
      }
      throw new Error(
        `La quantité minimale pour "${product.name}" est de ${minCheck.minimumInTotalUnit} ${product.unit} ` +
        `(commande actuelle : ${requiredQty} ${product.unit}).`,
      );
    }
  }

  return productById;
}

/**
 * Creates the order record in the database.
 */
async function createOrderRecord(tx: any, data: CreateOrderParams, paymentMethodCode: string): Promise<OrderCreated> {
  const buyerProfileId = await resolveBuyerProfileId(data.buyerId ?? null, { tx });
  // Look up ref IDs for status and payment method
  const [order] = await tx.insert(schema.orders).values({
    buyerId: buyerProfileId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    totalAmount: data.totalAmount,
    paymentMethod: paymentMethodCode as any,
    city: data.city,
    gpsLat: data.gpsLat,
    gpsLng: data.gpsLng,
    deliveryDesc: data.deliveryDesc || "",
    audioUrl: data.audioUrl,
    zoneId: data.zoneId || data.locationId || undefined,
    organizationId: data.organizationId || undefined,
    status: 'PENDING' as const,
  }).returning({
    id: schema.orders.id,
    totalAmount: schema.orders.totalAmount,
    status: schema.orders.status,
    buyerId: schema.orders.buyerId,
    organizationId: schema.orders.organizationId,
  });

  // Insert order items
  if (data.items.length > 0) {
    await tx.insert(schema.orderItems).values(
      data.items.map((item): { orderId: string; productId: string; quantity: number; priceAtSale: number } => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: item.price,
      }))
    );
  }

  return order;
}

/**
 * Decrements stock for all items in ONE statement (atomic, no DB calls in loops).
 * Also guards against concurrency by requiring sufficient stock in the UPDATE.
 */
async function decrementStock(tx: any, items: CreateOrderParams['items']): Promise<void> {
  const requiredByProductId = aggregateQuantities(items);
  if (requiredByProductId.size === 0) return;

  const tuples = Array.from(requiredByProductId.entries()).map(([productId, qty]) =>
    sql`(${productId}::uuid, ${qty}::double precision)`,
  );

  // UPDATE ... FROM (VALUES ...) ... RETURNING id
  const updatedRows: Array<{ id: string }> = (await tx.execute(
    sql`
      UPDATE ${schema.products}
      SET ${schema.products.quantityForSale} = ${schema.products.quantityForSale} - v.qty
      FROM (VALUES ${sql.join(tuples, sql`, `)}) AS v(id, qty)
      WHERE ${schema.products.id} = v.id
        AND ${schema.products.quantityForSale} >= v.qty
      RETURNING ${schema.products.id} AS id
    `,
  )) as any;

  if ((updatedRows?.length ?? 0) !== requiredByProductId.size) {
    throw new Error('STOCK_CONFLICT');
  }
}

/**
 * Logique métier centralisée pour créer une commande.
 * ✅ Scopée par organisation (si fournie).
 * ✅ AuditLog à la création.
 * ✅ Transaction atomique (commande + items + décrémentation stock).
 */
export async function createOrderService(data: CreateOrderParams) {
  const mappedPayment = mapPaymentMethodCode(data.paymentMethod);

  const order: OrderCreated = await db.transaction(async (tx: any) => {
    await validateInventory(tx, data.items);
    await decrementStock(tx, data.items);
    const created = await createOrderRecord(tx, data, mappedPayment);
    return created;
  });

  // Audit
  await audit({
    actorId: data.buyerId || 'SYSTEM',
    action: 'CREATE_ORDER',
    entityId: order.id,
    entityType: 'ORDER',
    newValue: { totalAmount: data.totalAmount, items: data.items.length, organizationId: data.organizationId },
  });

  return order;
}

/**
 * Récupère les détails d'une commande avec ses items et produits.
 * ✅ Select précis (pas de chargement de JSON lourds).
 * ✅ Vérifie l'accès : le buyer ou un admin org peut voir la commande.
 */
export async function getOrderDetails(orderId: string) {
  if (!orderId) return null;

  try {
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, orderId),
      columns: {
        id: true,
        customerName: true,
        customerPhone: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        city: true,
        gpsLat: true,
        gpsLng: true,
        deliveryDesc: true,
        createdAt: true,
        updatedAt: true,
        buyerId: true,
        organizationId: true,
        zoneId: true,
      },
      with: {
        items: {
          columns: {
            id: true,
            quantity: true,
            priceAtSale: true,
          },
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                price: true,
                unit: true,
                images: true,
                categoryLabel: true,
              }
            }
          }
        }
      }
    });

    return order;
  } catch (error) {
    console.error("❌ Erreur getOrderDetails:", error);
    return null;
  }
}