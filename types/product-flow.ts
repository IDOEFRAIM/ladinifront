/**
 * Types partagés pour le flux produit (création / édition).
 * Source unique de vérité — consommé par les hooks et composants.
 */

// ── Catalogue ──────────────────────────────────────────────────────────

export interface StandardPrice {
  id: string;
  subCategoryId: string;
  zoneId: string;
  pricePerUnit: number;
  unit: string;
  updatedById: string;
  updatedAt: Date;
  zone: { id: string; name: string };
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  blockedZoneIds: string[];
  standardPrices: StandardPrice[];
  _count?: { products: number };
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  subCategories: SubCategory[];
}

// ── Formulaire ─────────────────────────────────────────────────────────

export interface ProductFormData {
  /** ID de la catégorie parente sélectionnée à l'étape 1 */
  categoryId: string;
  /** ID de la sous-catégorie sélectionnée à l'étape 2 (clé étrangère en BDD) */
  subCategoryId: string;
  /** Label combiné d'affichage (ex: "Céréales / Maïs Blanc") */
  categoryLabel: string;
  /** Nom commercial du produit saisi par le producteur */
  name: string;
  /** Description textuelle optionnelle */
  description: string;
  /** Prix unitaire stocké sous forme de chaîne pour React Hook Form */
  price: string;
  /** Unité de mesure sélectionnée (KG, SAC, TONNE, etc.) */
  unit: string;
  /** Quantité disponible à la vente (mappé sur quantityForSale en BDD) */
  quantityForSale: string;
}

export const PRODUCT_FORM_DEFAULTS: ProductFormData = {
  categoryId: '',
  subCategoryId: '',
  categoryLabel: '',
  name: '',
  description: '',
  price: '',
  unit: 'KG',
  quantityForSale: '', // Aligné à 100% sur le champ quantityForSale
};

export type ProductFlowMode = 'create' | 'edit';

export interface ProductFlowProps {
  mode: ProductFlowMode;
  initialData?: Record<string, any>;
}

// ── Prix ───────────────────────────────────────────────────────────────

export interface PriceInfo {
  price: number;
  unit?: string;
}

export type StandardPriceMap = Record<string, PriceInfo>;

// ── Étapes du Tunnel (Steps) ───────────────────────────────────────────

export const STEPS = [
  { id: 1, label: 'Catégorie' },
  { id: 2, label: 'Sous-cat.' },
  { id: 3, label: 'Photos' },
  { id: 4, label: 'Détails' },
  { id: 5, label: 'Audio' },
  { id: 6, label: 'Aperçu' },
] as const;

export const TOTAL_STEPS = STEPS.length;

// ── Constantes Métiers ─────────────────────────────────────────────────

export const MAX_IMAGES = 3;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const UNIT_OPTIONS = ['KG', 'SAC', 'TONNE', 'UNITÉ'] as const;