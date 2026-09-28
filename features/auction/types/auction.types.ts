export type Auction = {
  id: string;
  status: string;
  deadline: string | null;
  maxPricePerUnit: number | null;
  unit?: string | null;
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
  /** Champ hérité (montant brut) — CONSERVÉ pour compatibilité, jamais réinterprété comme "par unité de l'enchère". */
  offeredPrice: number;
  offeredPriceBasis?: string | null;
  /** Sémantique propre au bid (« 450 000 FCFA par tonne », « Base de prix à préciser »…) — À AFFICHER. */
  pricingLabel?: string;
  pricingCertified?: boolean;
  /** Total comparable pour la quantité de l'enchère (chaîne, 2 décimales), ou `null` si non comparable. */
  comparableTotal?: string | null;
  normalizedLabel?: string | null;
  comparable?: boolean;
  /** Empreinte des termes ACTUELS de ce bid — à renvoyer telle quelle à `awardAuction` (`expectedFingerprint`). */
  award?: { fingerprint: string; total: string } | null;
  estimatedDeliveryDate?: string | Date | null;
  isBestBid?: boolean;
};

export type BidsApiResponse = {
  auctionId: string;
  auctionStatus: string;
  totalBids: number;
  /** Total comparable (chaîne) du meilleur bid comparable, ou `null` — jamais un `offeredPrice` brut. */
  bestBidPrice: string | null;
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
