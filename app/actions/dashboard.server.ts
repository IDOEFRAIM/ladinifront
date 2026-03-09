import { db } from '@/src/db';
import * as schema from '@/src/db/schema';

export async function fetchDashboardInventoryServer(userId?: string) {
  // If userId provided, filter by producer or user relation; otherwise return empty
  if (!userId) return [];

  // Simple inventory query: products for this producer (assuming producer.userId relation)
  const products = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.producerId, userId),
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });

  return products.map((p: any) => ({ id: p.id, name: p.name, quantity: p.quantityForSale || 0, unit: p.unit || 'KG', price: p.price || 0 }));
}

export default { fetchDashboardInventoryServer };
