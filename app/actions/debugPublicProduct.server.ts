import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function checkPublicProductById(id: string) {
  if (!id) throw new Error('MISSING_ID');

  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, id),
    columns: { id: true, name: true, quantityForSale: true, updatedAt: true },
  });

  if (!product) return { found: false, id };

  return {
    found: true,
    id: product.id,
    name: product.name ?? null,
    quantityForSale: product.quantityForSale ?? null,
    updatedAt: product.updatedAt ?? null,
  };
}

export default { checkPublicProductById };
