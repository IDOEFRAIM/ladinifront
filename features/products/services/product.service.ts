// Lecture publique d'une fiche produit (aucun contrôle d'accès : donnée publique du catalogue).
import { cache } from 'react';
import { getProductById } from '@/features/products/services/catalogue.service';
import type { Product } from '@/features/products/types/product.types';

/**
 * cache() : generateMetadata et la page partagent UN seul appel DB par requête.
 * Ne lève jamais : une erreur de lecture équivaut à « produit introuvable ».
 */
export const loadProduct = cache(async (id: string): Promise<Product | null> => {
  try {
    return await getProductById(id);
  } catch (err) {
    console.error('Erreur de récupération:', err);
    return null;
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Le produit existe-t-il VRAIMENT ? Contrairement à loadProduct (qui traduit toute erreur en « introuvable »),
 * cette fonction LÈVE sur panne DB : une panne temporaire ne doit jamais devenir un 404 mis en cache par l'ISR
 * (Google désindexerait une fiche valide). Un identifiant qui n'est pas un UUID n'existe pas (et ferait échouer PG).
 */
export async function productExists(id: string): Promise<boolean> {
  if (!UUID_RE.test(id)) return false;
  const { db } = await import('@/src/db');
  const { products } = await import('@/src/db/schema');
  const { eq } = await import('drizzle-orm');
  const row = await db.query.products.findFirst({ where: eq(products.id, id), columns: { id: true } });
  return Boolean(row);
}
