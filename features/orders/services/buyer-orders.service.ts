import { eq } from 'drizzle-orm';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

/**
 * Commandes de l'acheteur connecté, formatées pour le client (dates ISO, montants en number).
 * `kind: 'empty'` = pas de profil acheteur ou aucune commande.
 */
export async function getBuyerOrders(userId: string) {
  // 2. Récupération du profil acheteur
  const buyerProfile = await db.query.buyerProfiles.findFirst({
    where: eq(schema.buyerProfiles.userId, userId),
    columns: { id: true },
  });

  if (!buyerProfile) return { kind: 'empty' as const };

  // 3. Chargement optimisé (Une seule requête relationnelle)
  const userOrders = await db.query.orders.findMany({
    where: eq(schema.orders.buyerId, buyerProfile.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      items: {
        with: {
          product: true, // Récupère les infos produit direct
        }
      },
      delivery: true, // Récupère les infos de livraison direct
    },
  });

  if (userOrders.length === 0) return { kind: 'empty' as const };

  // 4. Formatage propre pour le client (Conversion Dates et Numbers)
  const formattedOrders = userOrders.map(order => ({
    ...order,
    // On s'assure que la date est une string pour éviter les erreurs de sérialisation Client
    createdAt: order.createdAt instanceof Date 
      ? order.createdAt.toISOString() 
      : new Date(order.createdAt).toISOString(),
    
    items: order.items.map(item => ({
      ...item,
      priceAtSale: Number(item.priceAtSale),
      // On s'assure que l'objet product est bien structuré comme attendu par OrdersList
      product: item.product ? {
        name: item.product.name,
        unit: item.product.unit,
        images: item.product.images as string[] || [],
      } : null,
    })),
    
    // On passe la livraison telle quelle (ou null)
    delivery: order.delivery ? {
      ...order.delivery,
      // Conversion optionnelle si tes champs DB sont des Decimal
      estimatedDistanceKm: order.delivery.estimatedDistanceKm ? Number(order.delivery.estimatedDistanceKm) : null
    } : null,
  }));
  return { kind: 'ok' as const, orders: formattedOrders };
}
