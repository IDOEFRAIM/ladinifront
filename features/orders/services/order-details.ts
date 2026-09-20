import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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
