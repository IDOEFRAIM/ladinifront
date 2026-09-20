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
