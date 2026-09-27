export const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

export const ORDER_UNITS = ['KG', 'TONNE', 'LITRE', 'BAG'] as const;

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  blockedZoneIds: string[];
  standardPrices: any[];
  // Seuil minimum de commande — policy PLATEFORME (voir
  // features/governance/services/category-write.ts::updateSubCategoryMinimum). `null` =
  // aucune règle configurée, comportement historique.
  minimumOrderQuantity: string | null;
  minimumOrderUnit: string | null;
  // Config unité — voir features/governance/services/category-write.ts::updateSubCategoryUnitConfig.
  // `null` = pas configuré (le backend continue de deviner depuis le texte libre).
  allowedUnits: string[] | null;
  priorityUnit: string | null;
  _count?: { products: number };
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  subCategories: SubCategory[];
}
