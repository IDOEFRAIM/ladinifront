export const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

export const UNIT_OPTIONS = ['KG', 'TONNE', 'LITRE', 'BAG','UNITE'] as const;

export interface PriceRow {
  subCategoryId: string;
  subCategoryName: string;
  categoryName: string;
  currentPrice: number | null;
  currentUnit: string;
  newPrice: string;
  newUnit: string;
  updatedBy?: string | null;
  updatedAt?: string | null;
}
