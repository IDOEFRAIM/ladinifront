/**
 * PRODUCT TYPES — Types d'affichage pour les produits
 * ══════════════════════════════════════════════════════════════════════════
 * Types UI enrichis (avec jointures producteur) utilisés par le Marketplace,
 * le Catalogue, le Panier, et les fiches produit.
 *
 * Le type DB brut est dans types/inferred.ts (re-export Drizzle $inferSelect).
 * Ici on définit les DTOs enrichis pour l'affichage.
 */

// ─── Catégories ─────────────────────────────────────────────────────────────
export type ProductCategory = 'cereales' | 'legumes' | 'animaux' | 'transforme' | 'outils';

// ─── Produit enrichi (jointure producteur) ──────────────────────────────────
export interface Product {
  id: string;
  producerId: string;
  name: string;
  categoryLabel: string;
  unit: string;
  price: number;
  quantityForSale?: number;
  /** @deprecated Utiliser quantityForSale */
  stock?: number;
  /** @deprecated Utiliser quantityForSale */
  quantity?: number;
  images: string[];
  audioUrl?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  producer?: {
    name: string;
    location: string;
    phone?: string;
    zone?: { id: string; name: string } | null;
  };
}

// ─── Filtres de recherche ───────────────────────────────────────────────────
export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  region?: string;
  searchQuery?: string;
  producerId?: string;
}

// ─── Formulaire producteur ──────────────────────────────────────────────────
export interface ProducerProductForm {
  id?: string;
  category: ProductCategory | '';
  categoryLabel: string;
  price: string;
  unit: string;
  quantity: string;
  newImages: File[];
  existingImages: string[];
  audioBlob: Blob | null;
}

// ─── Constantes catégories UI ───────────────────────────────────────────────
export const CATEGORIES_DATA = [
  { id: 'cereales', label: 'Céréales', icon: '🌾' },
  { id: 'legumes', label: 'Légumes', icon: '🥕' },
  { id: 'animaux', label: 'Animaux', icon: '🐂' },
  { id: 'transforme', label: 'Transformé', icon: '📦' },
  { id: 'outils', label: 'Outils', icon: '🚜' },
] as const;
