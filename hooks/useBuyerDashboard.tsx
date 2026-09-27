import { useCachedJson } from '@/hooks/useCachedJson';

// Définir des interfaces strictes pour la robustesse
export interface DashboardData {
  profile: any;
  activeOrders: unknown[];
  orderHistory: unknown[];
  auctions?: { active: unknown[]; won: unknown[]; lost: unknown[] };
  suggestedProducts: unknown[];
}

/** Même endpoint et même cache que BuyerDashboardPage : un seul appel réseau, réaffichage instantané à la revisite. */
export function useBuyerDashboard() {
  const { data, loading, error, refresh } = useCachedJson<DashboardData>('/api/buyer/dashboard');
  return { data, loading, error, refresh };
}
