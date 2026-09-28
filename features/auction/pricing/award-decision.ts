/**
 * Décision d'attribution CERTIFIÉE (web) — miroir de `backend/src/ladini/domain/bid_award.py::CertifiedAwardDecision`.
 *
 * L'acheteur ne désigne pas un gagnant sur « un prix » : il confirme un objet FIGÉ (producteur, prix + BASE,
 * quantité de l'enchère, total). Son empreinte SHA-256 est ce que l'exécution revalide sous verrou, et ce qui est
 * gelé sur `orders.award_pricing_snapshot`. L'empreinte web est IDENTIQUE à celle du backend pour les mêmes termes
 * (JSON canonique : clés triées, séparateurs compacts, montants en chaînes) — verrouillé par les vecteurs de parité.
 */
import { createHash } from 'node:crypto';
import {
  AwardNotPossible,
  BidPricingError,
  snapshotFromBid,
  snapshotToDict,
  totalFor,
  type AuctionTerms,
  type BidPricingRow,
  type PricingSnapshot,
} from './bid-pricing';
import { D, Dec } from './fixed-decimal';

export const DECISION_VERSION = 1;
const MONEY_SCALE = 2;

export interface CertifiedAwardDecision {
  auctionId: string;
  bidId: string;
  producerId: string;
  buyerId: string;
  pricing: PricingSnapshot;
  auctionQuantity: Dec;
  auctionUnit: string;
  awardTotal: Dec;
  decisionVersion: number;
}

export const BID_BASIS_UNKNOWN_MESSAGE =
  'Base de prix à préciser : le prix de cette offre n\'indique pas s\'il est par unité ou pour l\'ensemble. '
  + 'Le producteur doit d\'abord préciser sa base de prix avant de pouvoir la retenir.';

/**
 * Construit la décision depuis le snapshot CERTIFIÉ du bid. Refuse sans jamais déduire la base :
 *   - bid sans snapshot certifié -> `bid_basis_unknown` ;
 *   - base incompatible avec l'enchère / conditionnement non divisible -> `award_pricing_invalid`.
 */
export function buildAwardDecision(
  bid: BidPricingRow & { id: string; producerId: string },
  auction: AuctionTerms,
): CertifiedAwardDecision {
  const pricing = snapshotFromBid(bid);
  if (!pricing) throw new AwardNotPossible('bid_basis_unknown', BID_BASIS_UNKNOWN_MESSAGE);
  let total: Dec;
  try {
    total = totalFor(pricing, auction.quantity, auction.unit);
  } catch (e) {
    if (e instanceof BidPricingError) {
      throw new AwardNotPossible('award_pricing_invalid', `Le prix de cette offre ne peut pas être appliqué à l'enchère (${e.message}).`);
    }
    throw e;
  }
  return {
    auctionId: String(auction.id),
    bidId: String(bid.id),
    producerId: String(bid.producerId),
    buyerId: String(auction.buyerId),
    pricing,
    auctionQuantity: D(auction.quantity),
    auctionUnit: String(auction.unit).toUpperCase(),
    awardTotal: total.quantize(MONEY_SCALE),
    decisionVersion: DECISION_VERSION,
  };
}

/** Sérialisation canonique = `json.dumps(sort_keys=True, ensure_ascii=False, separators=(",", ":"))`. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function canonicalTerms(d: CertifiedAwardDecision): Record<string, unknown> {
  const p = snapshotToDict(d.pricing);
  const keys = [
    'schema_version', 'currency', 'commercial_price_amount', 'price_basis', 'price_unit',
    'package_type', 'package_content_amount', 'package_content_unit',
  ];
  return {
    v: d.decisionVersion,
    auction_id: d.auctionId,
    bid_id: d.bidId,
    producer_id: d.producerId,
    buyer_id: d.buyerId,
    pricing: Object.fromEntries(keys.map((k) => [k, p[k]])),
    auction_quantity: d.auctionQuantity.toPlain(),
    auction_unit: d.auctionUnit,
    award_total: d.awardTotal.toPlain(),
  };
}

export function fingerprintOf(d: CertifiedAwardDecision): string {
  return createHash('sha256').update(canonicalJson(canonicalTerms(d)), 'utf8').digest('hex');
}

/** Clé d'exécution : mêmes termes = même clé ; des termes changés = une autre clé (jamais un rejeu sur d'anciens termes). */
export function idempotencyKeyOf(d: CertifiedAwardDecision): string {
  return `award:${d.auctionId}:${d.bidId}:${fingerprintOf(d).slice(0, 16)}`;
}

/** Contenu de `orders.award_pricing_snapshot` : le snapshot du bid + les termes de l'attribution (schema_version 1). */
export function frozenSnapshotOf(d: CertifiedAwardDecision): Record<string, unknown> {
  return {
    ...snapshotToDict(d.pricing),
    award: {
      auction_id: d.auctionId,
      bid_id: d.bidId,
      producer_id: d.producerId,
      auction_quantity: d.auctionQuantity.toPlain(),
      auction_unit: d.auctionUnit,
      total_amount: d.awardTotal.toFixed(),
      fingerprint: fingerprintOf(d),
      decision_version: d.decisionVersion,
    },
  };
}
