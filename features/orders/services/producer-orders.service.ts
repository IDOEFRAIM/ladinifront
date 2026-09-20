import { desc, eq } from 'drizzle-orm';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

// Types stricts pour garantir la cohérence des données avec le composant OrdersTabs
export interface OrderItemMapped {
  name: string;
  quantity: number;
  unit: string;
}

export interface OrderMapped {
  id: string;
  customerName: string;
  customerPhone: string;
  location: string;
  date: string;
  total: number; // Somme calculée uniquement pour les produits de ce producteur
  status: string;
  items: OrderItemMapped[];
}

/** Commandes contenant au moins un produit du producteur ; le total ne compte que SES produits (quantité × prix fixé à la vente). */
export async function getProducerOrders(producerId: string): Promise<OrderMapped[]> {
  // 2. Requête Drizzle optimisée basée strictement sur ton schéma
  const rows = await db
    .select({
      orderId: schema.orderItems.orderId,
      quantity: schema.orderItems.quantity,
      priceAtSale: schema.orderItems.priceAtSale,
      // Champs issus de la table 'products'
      productName: schema.products.name,
      productUnit: schema.products.unit,
      // Champs issus de la table 'orders'
      orderStatus: schema.orders.status,
      orderCreatedAt: schema.orders.createdAt,
      orderCustomerName: schema.orders.customerName,
      orderCustomerPhone: schema.orders.customerPhone,
      orderCity: schema.orders.city,
      orderDeliveryDesc: schema.orders.deliveryDesc,
    })
    .from(schema.orderItems)
    // Jointure pour filtrer par rapport au propriétaire du produit
    .leftJoin(schema.products, eq(schema.products.id, schema.orderItems.productId))
    // Jointure pour récupérer les métadonnées de livraison et de statut de la commande
    .leftJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    // On cible uniquement les produits qui appartiennent au producteur connecté
    .where(eq(schema.products.producerId, producerId))
    // Tri par commandes les plus récentes
    .orderBy(desc(schema.orderItems.orderId));
  // 3. Transformation et regroupement par commande (Structure Map)
  const ordersMap = new Map<string, OrderMapped>();

  for (const row of rows) {
    if (!row.orderId) continue;

    // Si la commande n'est pas encore enregistrée dans notre Map, on l'initialise
    if (!ordersMap.has(row.orderId)) {
      const customerName = row.orderCustomerName || 'Client';
      const customerPhone = row.orderCustomerPhone || '';
      const location = row.orderCity || row.orderDeliveryDesc || 'Lieu non précisé';
      
      const formattedDate = row.orderCreatedAt
        ? new Date(row.orderCreatedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '';

      ordersMap.set(row.orderId, {
        id: row.orderId,
        customerName,
        customerPhone,
        location,
        date: formattedDate,
        total: 0, // Sera incrémenté juste en dessous
        status: String(row.orderStatus || 'PENDING').toLowerCase(),
        items: [],
      });
    }

    const currentOrder = ordersMap.get(row.orderId)!;
    
    // Ajout de l'article acheté dans le tableau de la commande
    if (row.productName) {
      currentOrder.items.push({
        name: row.productName,
        quantity: Number(row.quantity || 0),
        unit: row.productUnit || 'KG',
      });
    }

    // Calcul du sous-total propre à ce producteur (quantité * prix fixé à la vente)
    const quantity = Number(row.quantity || 0);
    const priceAtSale = Number(row.priceAtSale || 0);
    
    currentOrder.total += quantity * priceAtSale;
  }

  // 4. Conversion de notre dictionnaire (Map) en tableau propre pour ton interface
  const allOrders = Array.from(ordersMap.values());
  return allOrders;
}
