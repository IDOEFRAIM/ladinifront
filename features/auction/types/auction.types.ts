export type Auction = {
  id: string;
  status: string;
  deadline: string | null;
  maxPricePerUnit: number | null;
  autoExtend?: boolean | null;
  escrowWalletId?: string | null;
  escrowStatus?: string | null;
  incoterm?: string | null;
  deliveryLocation?: string | null;
  deliveryDeadline?: string | Date | null;
  subCategoryId?: string | null;
  targetZoneId?: string | null;
  targetZone?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuctionBid = {
  id: string;
  producerName?: string;
  offeredPrice: number;
  estimatedDeliveryDate?: string | Date | null;
  isBestBid?: boolean;
};

export type BidsApiResponse = {
  auctionId: string;
  auctionStatus: string;
  totalBids: number;
  bestBidPrice: number | null;
  bids: AuctionBid[];
};

export type ProducerItem = {
  producerId: string;
  userId: string;
  name: string;
  zoneId: string | null;
  geoPriority: number;
  trustScore?: { globalScore?: number; reliabilityIndex?: number } | null;
  hasBid?: boolean;
  hasMatchingProduct?: boolean | null;
};
