export const UNITS = ['KG', 'G', 'PACK', 'TONNE', 'SACK'] as const;
export const PAGE_SIZE = 10;

export interface AllocationItem {
  id: string;
  seedType: string;
  totalQuantity: number;
  remainingQuantity: number;
  unit: string;
  zone: { id: string; name: string; code: string } | null;
  allocatedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface ZoneOption { id: string; name: string; code: string }
