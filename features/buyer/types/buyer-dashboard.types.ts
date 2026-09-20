// Contrat de GET /api/buyer/dashboard — dérivé des retours des services (aucune duplication à maintenir).
// `import type` : rien du code serveur n'est embarqué côté client. Les dates arrivent sérialisées (string) en JSON ;
// les composants les manipulent via `new Date(...)`, ce qui fonctionne pour les deux formes.
import type {
  getBuyerDashboardProfile,
  getBuyerActiveOrders,
  getBuyerOrderHistory,
  getBuyerAuctionHistory,
  getBuyerBillingSummary,
} from '@/features/buyer/services/buyer.service';
import type { BuyerPreorder } from '@/features/orders/services/preorder.service';
import type { suggestedProducts } from '@/features/buyer/services/crossSelling.service';

export interface BuyerDashboardResponse {
  profile: Awaited<ReturnType<typeof getBuyerDashboardProfile>> | null;
  activeOrders: Awaited<ReturnType<typeof getBuyerActiveOrders>>;
  orderHistory: Awaited<ReturnType<typeof getBuyerOrderHistory>>;
  auctions: Awaited<ReturnType<typeof getBuyerAuctionHistory>>;
  billingSummary: Awaited<ReturnType<typeof getBuyerBillingSummary>> | null;
  preorders: BuyerPreorder[];
  suggestedProducts: Awaited<ReturnType<typeof suggestedProducts>>;
}

export type BuyerActiveOrder = BuyerDashboardResponse['activeOrders'][number];
export type BuyerAuctionSummary = BuyerDashboardResponse['auctions'];
export type BuyerBillingSummary = NonNullable<BuyerDashboardResponse['billingSummary']>;
export type BuyerSuggestedProduct = BuyerDashboardResponse['suggestedProducts'][number];
