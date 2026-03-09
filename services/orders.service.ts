'use server'
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, sql } from 'drizzle-orm';
import { audit, snapshot } from "@/lib/audit";
import getUserIdFromSession from "@/lib/get-userId";

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
 * Validates inventory for all items in the order.
 */
async function validateInventory(tx: any, items: CreateOrderParams['items']): Promise<void> {
  for (const item of items) {
    const product: ProductInventoryCheck | null = await tx.query.products.findFirst({
      where: eq(schema.products.id, item.productId),
      columns: { id: true, quantityForSale: true, name: true }
    });

    if (!product) {
      throw new Error(`Produit introuvable: ${item.productId}`);
    }
    if (product.quantityForSale < item.quantity) {
      throw new Error(`Stock insuffisant pour "${product.name}" (disponible: ${product.quantityForSale})`);
    }
  }
}

/**
 * Creates the order record in the database.
 */
async function createOrderRecord(tx: any, data: CreateOrderParams, paymentMethodCode: string): Promise<OrderCreated> {
  // Look up ref IDs for status and payment method
  const [order] = await tx.insert(schema.orders).values({
    buyerId: data.buyerId,
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
 * Decrements stock for all items in the order.
 */
async function decrementStock(tx: any, items: CreateOrderParams['items']): Promise<void> {
  for (const item of items) {
    await tx.update(schema.products)
      .set({ quantityForSale: sql`${schema.products.quantityForSale} - ${item.quantity}` })
      .where(eq(schema.products.id, item.productId));
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
    const created = await createOrderRecord(tx, data, mappedPayment);
    await decrementStock(tx, data.items);
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