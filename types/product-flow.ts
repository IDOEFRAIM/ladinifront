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
  category: string;
  categoryLabel: string;
  categoryId?: string;
  name: string;
  description: string;
  price: string;
  unit: string;
  quantity: string;
}

export const PRODUCT_FORM_DEFAULTS: ProductFormData = {
  category: '',
  categoryLabel: '',
  name: '',
  description: '',
  price: '',
  unit: 'KG',
  quantity: '',
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

// ── Steps ──────────────────────────────────────────────────────────────

export const STEPS = [
  { id: 1, label: 'Catégorie' },
  { id: 2, label: 'Sous-cat.' },
  { id: 3, label: 'Photos' },
  { id: 4, label: 'Détails' },
  { id: 5, label: 'Audio' },
  { id: 6, label: 'Aperçu' },
] as const;

export const TOTAL_STEPS = STEPS.length;

// ── Constantes ─────────────────────────────────────────────────────────

export const MAX_IMAGES = 3;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const UNIT_OPTIONS = ['KG', 'SAC', 'TONNE', 'UNITÉ'] as const;
