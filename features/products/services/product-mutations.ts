import { codedError } from '@/lib/errors';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { validateProductFormData, validateProductUpdateFormData } from '@/features/products/services/product-form-parse';
import { processProductImages, processProductAudio, updateProductImages, updateProductAudio } from '@/features/products/services/product-media';

type UnitValue = typeof schema.products.$inferInsert['unit'];

export async function createProductFromForm(formData: FormData, producerId: string) {
  if (!producerId) {
    throw codedError('MISSING_PRODUCER');
  }

  const validation = await validateProductFormData(formData);
  const imageNames = await processProductImages(formData);
  const audioName = await processProductAudio(formData);

  const insertValues: typeof schema.products.$inferInsert = {
    ...validation.data,
    price: String(validation.data.price),
    quantityForSale: String(validation.data.quantityForSale),
    images: imageNames,
    audioUrl: audioName,
    producerId,
    unit: validation.data.unit as UnitValue,
  };

  const [product] = await db.insert(schema.products).values(insertValues).returning();

  return product;
}

export async function updateProductFromForm(formData: FormData, actorProducerId?: string) {
  const productId = String(formData.get('id') || '');
  if (!productId) {
    throw codedError('MISSING_ID');
  }

  const oldProduct = await db.query.products.findFirst({ where: eq(schema.products.id, productId) });
  if (!oldProduct) {
    throw codedError('NOT_FOUND');
  }

  // Ownership check: if actorProducerId provided, ensure they own the product
  if (actorProducerId && oldProduct.producerId !== actorProducerId) {
    throw codedError('FORBIDDEN');
  }

  const finalImages = await updateProductImages(formData, oldProduct.images);
  const audioName = await updateProductAudio(formData, oldProduct.audioUrl);
  const formDataValues = await validateProductUpdateFormData(formData);

  const [updated] = await db.update(schema.products).set({
    ...formDataValues,
    price: formDataValues.price === undefined ? undefined : String(formDataValues.price),
    quantityForSale: formDataValues.quantityForSale === undefined ? undefined : String(formDataValues.quantityForSale),
    unit: formDataValues.unit as UnitValue | undefined,
    images: finalImages,
    audioUrl: audioName,
  }).where(eq(schema.products.id, productId)).returning();

  return updated;
}
