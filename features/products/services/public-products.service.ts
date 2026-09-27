import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or, ilike, inArray, type SQL } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';

type Conditions = (SQL | undefined)[];

async function addCategoryFilter(conditions: Conditions, category?: string) {
  if (category && category !== 'all') {
    conditions.push(ilike(schema.products.categoryLabel, `%${category}%`));
  }
}

async function addSearchFilter(conditions: Conditions, search?: string) {
  if (search) {
    conditions.push(or(ilike(schema.products.categoryLabel, `%${search}%`), ilike(schema.products.name, `%${search}%`)));
  }
}

async function addRegionFilter(conditions: Conditions, region?: string) {
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
    const producerIds = matchingProducers.map((p) => p.id);
    if (producerIds.length === 0) return false;
    conditions.push(inArray(schema.products.producerId, producerIds));
  }
  return true;
}

// Plafond dur sur le catalogue public : évite le scan complet + join de la
// table `products` à chaque chargement de page (cause principale de lenteur
// et de saturation du pool DB sous forte charge concurrente — la page
// catalogue est `force-dynamic`, donc cette requête tourne à CHAQUE visite).
const DEFAULT_PRODUCTS_LIMIT = 60;
const MAX_PRODUCTS_LIMIT = 100;

export async function fetchProductsServer(filters: { category?: string; region?: string; search?: string; limit?: number } = {}) {
  const conditions: Conditions = [];
  await addCategoryFilter(conditions, filters.category);
  await addSearchFilter(conditions, filters.search);
  const hasRegion = await addRegionFilter(conditions, filters.region);

  if (!hasRegion) return [];

  const limit = Math.min(filters.limit && filters.limit > 0 ? filters.limit : DEFAULT_PRODUCTS_LIMIT, MAX_PRODUCTS_LIMIT);

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
    limit,
  });

  return products.map((p) => ({
    id: p.id,
    producerId: p.producerId || p.producer?.id || '',
    name: p.name,
    category: p.categoryLabel,
    categoryLabel: p.categoryLabel,
    subCategoryId: p.subCategoryId ?? null,
    price: p.price,
    unit: p.unit,
    quantity: p.quantityForSale,
    images: p.images,
    description: p.description,
    audioUrl: p.audioUrl,
    location: { address: p.producer?.region || p.producer?.zone?.name || 'Localisation inconnue', latitude: null, longitude: null },
    producer: { name: p.producer?.businessName || p.producer?.user?.name || 'Producteur', phone: p.producer?.user?.phone || null, location: p.producer?.region || p.producer?.zone?.name || '' },
    stock: p.quantityForSale,
    status: Number(p.quantityForSale) > 0 ? 'active' : 'sold_out',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

type ProducerRow = { commune?: string | null; region?: string | null; businessName?: string | null; id?: string; user?: { name?: string | null; phone?: string | null } | null };
type ProductRow = Awaited<ReturnType<typeof loadProductRow>>;

function loadProductRow(id: string) {
  return db.query.products.findFirst({
    where: eq(schema.products.id, id),
    with: { producer: { with: { user: { columns: { name: true, phone: true } } } } },
  });
}

function getLocationAddress(producer: ProducerRow | null): string {
  if (!producer) return 'Localisation inconnue';
  return [producer.commune, producer.region].filter(Boolean).join(', ');
}

function getProducerInfo(producer: ProducerRow | null, producerUser: ProducerRow['user'], locationAddress: string) {
  return {
    name: producer?.businessName || producerUser?.name || 'Producteur',
    location: locationAddress,
    phone: producerUser?.phone || null,
  };
}

function formatProductResponse(product: NonNullable<ProductRow>) {
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
    subCategoryId: product.subCategoryId ?? null,
    price: product.price ?? 0,
    unit: product.unit ?? '',
    quantity,
    stock: quantity,
    description: product.description || '',
    images: Array.isArray(product.images) ? product.images : [],
    audioUrl: product.audioUrl || null,
    status: Number(quantity) > 0 ? 'active' : 'sold_out',
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

  const product = await loadProductRow(normalizedId);
  if (!product) return null;
  return formatProductResponse(product);
}

// Les catégories/régions changent rarement (ajout de produit/producteur) —
// pas besoin de re-scanner `products`/`producers` en entier à chaque
// chargement du catalogue. Cache 5 min, invalidable via la tag `public-filters`.
export const fetchFiltersServer = unstable_cache(
  async () => {
    const categoriesRes = await db.select({ categoryLabel: schema.products.categoryLabel }).from(schema.products).groupBy(schema.products.categoryLabel);
    const categories = categoriesRes.map((r) => r.categoryLabel).filter(Boolean);

    const locationsRes = await db.select({ name: schema.producers.region }).from(schema.producers).groupBy(schema.producers.region);
    const locations = locationsRes.map((r) => ({ id: String(r.name || '').trim(), name: r.name }));

    return { categories, locations };
  },
  ['public-filters'],
  { revalidate: 300, tags: ['public-filters'] }
);

export default { fetchProductsServer, fetchProductByIdServer, fetchFiltersServer };
