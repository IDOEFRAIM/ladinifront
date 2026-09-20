import { absoluteUrl, breadcrumbJsonLd, truncate } from '@/lib/seo';
import type { Product } from '@/features/products/types/product.types';

export interface ProductJsonLdInput {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  price: number;
  quantity: number;
  categoryLabel?: string | null;
  sellerName?: string | null;
}

export function productJsonLd(p: ProductJsonLdInput) {
  const url = absoluteUrl(`/publicProducts/${p.id}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: p.name,
    description: p.description ? truncate(p.description, 500) : `${p.name} — produit agricole du Burkina Faso sur Ladini.`,
    image: (p.images ?? []).filter(Boolean).map(absoluteUrl),
    category: p.categoryLabel || undefined,
    sku: p.id,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'XOF',
      price: p.price,
      availability: p.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...(p.sellerName ? { seller: { '@type': 'Organization', name: p.sellerName } } : {}),
    },
  };
}

/** Blocs JSON-LD d'une fiche produit : Product (prix, disponibilité) + fil d'Ariane. */
export function productPageJsonLd(product: Product) {
  return [
    productJsonLd({
      id: product.id,
      name: product.name,
      description: product.description,
      images: product.images,
      price: product.price,
      quantity: Number(product.quantityForSale ?? product.quantity ?? product.stock ?? 0),
      categoryLabel: product.categoryLabel,
      sellerName: product.producer?.name,
    }),
    breadcrumbJsonLd([
      { name: 'Accueil', path: '/' },
      { name: 'Catalogue', path: '/catalogue' },
      { name: product.name, path: `/publicProducts/${product.id}` },
    ]),
  ];
}
