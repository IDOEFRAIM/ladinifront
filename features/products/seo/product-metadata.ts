import type { Metadata } from 'next';
import { absoluteUrl, DEFAULT_OG_IMAGE, truncate } from '@/lib/seo';
import type { Product } from '@/features/products/types/product.types';

/** Métadonnées SEO d'une fiche produit : titre, description, canonical, Open Graph, Twitter. */
export function buildProductMetadata(id: string, product: Product | null): Metadata {
  if (!product) {
    // Produit retiré / introuvable : ne pas indexer la page d'erreur.
    return { title: 'Produit introuvable', robots: { index: false, follow: true } };
  }

  const price = product.price.toLocaleString('fr-FR');
  const where = product.producer?.location ? ` à ${product.producer.location}` : '';
  const title = `${product.name} — ${price} FCFA/${product.unit}${where}`;
  const description = truncate(
    product.description ||
      `Achetez ${product.name} directement auprès de ${product.producer?.name || 'producteurs'} au Burkina Faso. ${price} FCFA/${product.unit}, livraison possible.`
  );
  const image = product.images?.[0] ? absoluteUrl(product.images[0]) : undefined;
  const path = `/publicProducts/${id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title,
      description,
      url: path,
      siteName: 'Ladini',
      images: image ? [{ url: image, alt: product.name }] : [DEFAULT_OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined },
  };
}
