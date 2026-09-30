export type Auction = {
  id: string;
  status: string;
  deadline: string | null;
  maxPricePerUnit: number | null;
  quantity?: string | number | null;
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
  /** Ce que le bouton "Attribuer" doit lire — jamais recalculé dans le composant (commodité d'affichage, le
   * serveur reste seul autoritaire). `false` pour un bid legacy, incomparable, retiré ou déjà tranché. */
  awardable?: boolean;
  status?: string;
  isWinner?: boolean;
  producerId?: string;
  estimatedDeliveryDate?: string | Date | null;
  isBestBid?: boolean;
};

export type BidsApiResponse = {
  auctionId: string;
  auctionStatus: string;
  totalBids: number;
  /** Total comparable (chaîne) du meilleur bid comparable, ou `null` — jamais un `offeredPrice` brut. */
  bestBidPrice: string | null;
  /** `true` pour le propriétaire de l'enchère (ou un admin) : pilote l'affichage du flux d'attribution. Le
   * serveur (`awardAuction`) revérifie quand même l'appartenance — ceci n'est jamais une permission. */
  viewerCanAward?: boolean;
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
