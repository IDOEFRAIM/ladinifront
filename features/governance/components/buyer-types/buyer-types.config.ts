export const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', red: '#EF4444',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

export type BuyerType = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
