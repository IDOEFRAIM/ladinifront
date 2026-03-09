import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or, ilike, inArray } from 'drizzle-orm';

async function addCategoryFilter(conditions: any[], category?: string) {
  if (category && category !== 'all') {
    conditions.push(ilike(schema.products.categoryLabel, `%${category}%`));
  }
}

async function addSearchFilter(conditions: any[], search?: string) {
  if (search) {
    conditions.push(or(ilike(schema.products.categoryLabel, `%${search}%`), ilike(schema.products.name, `%${search}%`)));
  }
}

async function addRegionFilter(conditions: any[], region?: string) {
  if (region && region !== 'all') {
    const matchingProducers = await db
      .select({ id: schema.producers.id })
      .from(schema.producers)
      .leftJoin(schema.zones, eq(schema.producers.zoneId, schema.zones.id))
      .where(
        or(
          ilike(schema.zones.name, `%${region}%`),
          ilike(schema.producers.region, `%${region}%`),
        )
      );
    const producerIds = matchingProducers.map((p: any) => p.id);
    if (producerIds.length === 0) return false;
    conditions.push(inArray(schema.products.producerId, producerIds));
  }
  return true;
}

export async function fetchProductsServer(filters: { category?: string; region?: string; search?: string } = {}) {
  const conditions: any[] = [];
  await addCategoryFilter(conditions, filters.category);
  await addSearchFilter(conditions, filters.search);
  const hasRegion = await addRegionFilter(conditions, filters.region);
  
  if (!hasRegion) return [];

  const products = await db.query.products.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      producer: {
        with: {
          user: { columns: { name: true, phone: true } },
          zone: { columns: { id: true, name: true, code: true } },
        }
      }
    },
    orderBy: (t, { desc: d }) => [d(t.createdAt)],
  });

  return products.map((p: any) => ({
    id: p.id,
    producerId: p.producerId || p.producer?.id || '',
    name: p.name,
    category: p.categoryLabel,
    categoryLabel: p.categoryLabel,
    price: p.price,
    unit: p.unit,
    quantity: p.quantityForSale,
    images: p.images,
    description: p.description,
    audioUrl: p.audioUrl,
    location: { address: p.producer?.region || p.producer?.zone?.name || 'Localisation inconnue', latitude: null, longitude: null },
    producer: { name: p.producer?.businessName || p.producer?.user?.name || 'Producteur', phone: p.producer?.user?.phone || null, location: p.producer?.region || p.producer?.zone?.name || '' },
    stock: p.quantityForSale,
    status: p.quantityForSale > 0 ? 'active' : 'sold_out',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

function getLocationAddress(producer: any): string {
  if (!producer) return 'Localisation inconnue';
  return [producer.commune, producer.region].filter(Boolean).join(', ');
}

function getProducerInfo(producer: any, producerUser: any, locationAddress: string) {
  return {
    name: producer?.businessName || producerUser?.name || 'Producteur',
    location: locationAddress,
    phone: producerUser?.phone || null,
  };
}

function formatProductResponse(product: any) {
  const producer = product.producer ?? null;
  const producerUser = producer?.user ?? null;
  const quantity = product.quantityForSale ?? 0;
  const locationAddress = getLocationAddress(producer);

  return {
    id: product.id,
    producerId: product.producerId || producer?.id || '',
    name: product.name || 'Produit',
    category: product.categoryLabel || '',
    categoryLabel: product.categoryLabel || '',
    price: product.price ?? 0,
    unit: product.unit ?? '',
    quantity,
    stock: quantity,
    description: product.description || '',
    images: Array.isArray(product.images) ? product.images : [],
    audioUrl: product.audioUrl || null,
    status: quantity > 0 ? 'active' : 'sold_out',
    location: { address: locationAddress, latitude: 0, longitude: 0 },
    producer: getProducerInfo(producer, producerUser, locationAddress),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export async function fetchProductByIdServer(id: string) {
  // Quick debug logging to capture invalid/empty ids that caused runtime DB errors previously
  if (!id) {
    console.warn('[fetchProductByIdServer] called with empty id');
    return null;
  }
  const normalizedId = String(id).trim();
  if (!normalizedId) {
    console.warn('[fetchProductByIdServer] called with blank/whitespace id:', JSON.stringify(id));
    return null;
  }

  const product = await db.query.products.findFirst({
    where: eq(schema.products.id, normalizedId),
    with: {
      producer: { with: { user: { columns: { name: true, phone: true } } } }
    }
  });
  if (!product) return null;
  return formatProductResponse(product);
}

export async function fetchFiltersServer() {
  // categories & locations
  const categoriesRes = await db.select({ categoryLabel: schema.products.categoryLabel }).from(schema.products).groupBy(schema.products.categoryLabel);
  const categories = categoriesRes.map((r: any) => r.categoryLabel).filter(Boolean);

  const locationsRes = await db.select({ id: schema.producers.id, name: schema.producers.region }).from(schema.producers).groupBy(schema.producers.region);
  const locations = locationsRes.map((r: any) => ({ id: String(r.name || r.id).trim(), name: r.name }));

  return { categories, locations };
}

export default { fetchProductsServer, fetchProductByIdServer, fetchFiltersServer };
