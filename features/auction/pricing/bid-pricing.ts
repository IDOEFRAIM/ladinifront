/**
 * Contrat de prix d'un BID côté web (Phase B2c.1) — miroir déterministe de
 * `backend/src/ladini/domain/commercial_pricing_snapshot.py` + `bid_award.py` (schema_version = 1).
 *
 * POURQUOI un miroir TypeScript plutôt qu'un appel au backend (décision B3, voir
 * `docs/domain/COMMERCIAL_PRICING_B2C1_WEB_BID_AWARD.md` côté backend) :
 *   - le web écrit directement en base (Drizzle) et possède son propre cycle de vie d'enchère
 *     (AWARDED / WINNER, session utilisateur, cron de règlement sans utilisateur) ; le point d'attribution
 *     Python est identifié par téléphone et suit le cycle de vie WhatsApp (CLOSED / WINNING) ;
 *   - un appel HTTP synchrone web -> backend ajouterait une dépendance de disponibilité à chaque offre.
 *
 * Le risque « deux moteurs qui divergent en silence » est traité par la PARITÉ : les vecteurs
 * (`__tests__/auction/fixtures/pricing-parity-vectors.json`) sont GÉNÉRÉS par le moteur Python et rejoués à
 * l'identique ici ET côté backend (`tests/unit/test_web_pricing_parity.py`, copie synchronisée par
 * `tests/schema/sync_contract.py`). Un écart de total, de libellé, de colonne ou d'empreinte fait échouer les
 * deux suites.
 *
 * Règles non négociables :
 *   - une base inconnue (bid antérieur à B2a) n'est ni comparable ni attribuable — jamais « par unité de l'enchère » ;
 *   - un total n'est JAMAIS « prix brut × quantité » : il suit la base déclarée ;
 *   - aucun `number` flottant ne porte un montant (voir `fixed-decimal.ts`).
 */
import { D, Dec, DecimalError } from './fixed-decimal';
import { baseUnitFor, canonicalWebUnit, canonUnit, fmtNum, unitDisplay, unitFactor, unitFamily } from './units';

export const PRICE_BASES = ['PER_BASE_UNIT', 'PER_PACKAGE', 'TOTAL_LOT'] as const;
export type PriceBasis = (typeof PRICE_BASES)[number];
export const SNAPSHOT_SCHEMA_VERSION = 1;
export const DEFAULT_CURRENCY = 'XOF';
export const LEGACY_UNSPECIFIED = 'LEGACY_UNSPECIFIED';

const MONEY_SCALE = 2;
const NORMALIZED_SCALE = 4;
/** numeric(12,2) côté `bids.offered_price` */
const MAX_AMOUNT = D('9999999999.99');
const CURRENCY_ALIASES: Record<string, string> = { FCFA: 'XOF', CFA: 'XOF', 'F CFA': 'XOF', XOF: 'XOF' };

export class BidPricingError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'BidPricingError';
  }
}

/** Refus d'attribution avant toute écriture. `code` est stable (tests, réponses API). */
export class AwardNotPossible extends BidPricingError {}

// ── Types ──────────────────────────────────────────────────────────────────────────────────────────────────

export interface AuctionTerms {
  id: string;
  buyerId: string;
  quantity: string | number;
  unit: string;
}

/** Ce que le producteur DIT : un montant ET sa base. Jamais un nombre seul. */
export interface BidPricingInput {
  amount: string | number;
  basis: string;
  priceUnit?: string | null;
  packageType?: string | null;
  packageContentAmount?: string | number | null;
  packageContentUnit?: string | null;
  currency?: string | null;
}

export interface PricingSnapshot {
  amount: Dec;
  basis: PriceBasis;
  priceUnit: string | null;
  packageType: string | null;
  packageContentAmount: Dec | null;
  packageContentUnit: string | null;
  inventoryQuantity: Dec | null;
  inventoryUnit: string | null;
  normalizedUnitPrice: Dec | null;
  normalizedUnit: string | null;
  currency: string;
  schemaVersion: number;
}

/** Colonnes `marketplace.bids` (montants en chaînes : jamais de flottant vers la base). */
export interface BidPricingColumns {
  offeredPrice: string;
  offeredPriceBasis: PriceBasis;
  offeredPriceUnit: string | null;
  offeredPriceCurrency: string;
  packageType: string | null;
  packageContentAmount: string | null;
  packageContentUnit: string | null;
  normalizedUnitPrice: string | null;
  normalizedUnit: string | null;
  pricingSnapshotVersion: number;
}

/** Sous-ensemble d'une ligne `bids` nécessaire pour relire le prix. */
export interface BidPricingRow {
  id?: string;
  producerId?: string;
  offeredPrice: string | number | null;
  offeredPriceBasis?: string | null;
  offeredPriceUnit?: string | null;
  offeredPriceCurrency?: string | null;
  packageType?: string | null;
  packageContentAmount?: string | number | null;
  packageContentUnit?: string | null;
  normalizedUnitPrice?: string | number | null;
  normalizedUnit?: string | null;
  pricingSnapshotVersion?: number | null;
}

// ── Construction (bid NEUF) ─────────────────────────────────────────────────────────────────────────────────

function parseMoney(value: unknown, field: string): Dec {
  let d: Dec;
  try {
    d = D(value as string | number);
  } catch (e) {
    if (e instanceof DecimalError) throw new BidPricingError('amount_invalid', `${field} : nombre invalide`);
    throw e;
  }
  if (!d.isPositive) throw new BidPricingError('amount_invalid', `${field} doit être supérieur à 0`);
  if (d.quantize(MONEY_SCALE).cmp(d) !== 0) {
    throw new BidPricingError('amount_precision', `${field} : 2 décimales maximum`);
  }
  if (d.cmp(MAX_AMOUNT) > 0) throw new BidPricingError('amount_too_large', `${field} dépasse le maximum autorisé`);
  return d;
}

export function normalizeCurrency(value: unknown): string {
  const raw = String(value ?? '').trim().toUpperCase();
  return raw ? (CURRENCY_ALIASES[raw] ?? raw) : DEFAULT_CURRENCY;
}

/**
 * Snapshot d'un bid NEUF. La base est OBLIGATOIRE (« 450000 » seul n'est pas un bid) ; elle est validée
 * contre l'unité de l'enchère mais n'en est JAMAIS déduite. Miroir de `build_bid_pricing_snapshot`.
 *
 * `allowPackage: false` (défaut web) : le conditionnement n'est pas exposé dans le formulaire web de cette phase ;
 * un PER_PACKAGE est refusé ici (les bids PER_PACKAGE écrits par WhatsApp restent lisibles/comparables).
 */
export function buildBidPricing(
  input: BidPricingInput,
  auction: Pick<AuctionTerms, 'quantity' | 'unit'>,
  opts: { allowPackage?: boolean } = {},
): PricingSnapshot {
  const basisRaw = String(input.basis ?? '').trim().toUpperCase();
  if (!basisRaw) throw new BidPricingError('basis_required', 'La base du prix est obligatoire (par unité ou pour tout le lot)');
  if (!(PRICE_BASES as readonly string[]).includes(basisRaw)) {
    throw new BidPricingError('basis_unknown', `Base de prix inconnue : ${input.basis}`);
  }
  const basis = basisRaw as PriceBasis;
  if (basis === 'PER_PACKAGE' && !opts.allowPackage) {
    throw new BidPricingError('package_not_supported', 'Le prix par conditionnement n\'est pas proposé sur le web');
  }

  const amount = parseMoney(input.amount, 'Prix');
  const auctionUnit = canonUnit(auction.unit);
  if (!auctionUnit) throw new BidPricingError('auction_unit_missing', 'Unité de l\'enchère manquante');
  let inventoryQuantity: Dec;
  try {
    inventoryQuantity = D(auction.quantity);
  } catch {
    throw new BidPricingError('auction_quantity_invalid', 'Quantité de l\'enchère invalide');
  }
  if (!inventoryQuantity.isPositive) throw new BidPricingError('auction_quantity_invalid', 'Quantité de l\'enchère invalide');

  let priceUnit: string | null = null;
  let packageType: string | null = null;
  let packageContentAmount: Dec | null = null;
  let packageContentUnit: string | null = null;

  if (basis === 'PER_BASE_UNIT') {
    priceUnit = canonicalWebUnit(input.priceUnit);
    if (!priceUnit) throw new BidPricingError('price_unit_required', 'Précisez l\'unité du prix (par tonne, par kg…)');
    if (unitFamily(priceUnit) !== unitFamily(auctionUnit)) {
      throw new BidPricingError('price_unit_incompatible', `Un prix par ${priceUnit} n'est pas applicable à une enchère en ${auctionUnit}`);
    }
  } else {
    if (canonUnit(input.priceUnit)) {
      throw new BidPricingError('price_unit_forbidden', `Une base ${basis} n'admet pas d'unité de prix`);
    }
    if (basis === 'PER_PACKAGE') {
      packageType = canonUnit(input.packageType);
      packageContentUnit = canonicalWebUnit(input.packageContentUnit);
      try {
        packageContentAmount = D(input.packageContentAmount as string | number);
      } catch {
        throw new BidPricingError('package_invalid', 'Contenu du conditionnement invalide');
      }
      if (!packageType || !packageContentUnit || !packageContentAmount.isPositive) {
        throw new BidPricingError('package_invalid', 'Le conditionnement exige un type, un contenu > 0 et une unité');
      }
      if (packageContentAmount.quantize(3).cmp(packageContentAmount) !== 0) {
        throw new BidPricingError('package_invalid', 'Contenu du conditionnement : 3 décimales maximum');
      }
      if (unitFamily(packageContentUnit) !== unitFamily(auctionUnit)) {
        throw new BidPricingError('package_invalid', `Contenu en ${packageContentUnit} incompatible avec ${auctionUnit}`);
      }
    } else if (input.packageType || input.packageContentAmount || input.packageContentUnit) {
      throw new BidPricingError('package_forbidden', `Une base ${basis} n'admet aucun conditionnement`);
    }
  }

  const snapshot: PricingSnapshot = {
    amount,
    basis,
    priceUnit,
    packageType,
    packageContentAmount,
    packageContentUnit,
    inventoryQuantity,
    inventoryUnit: auctionUnit,
    normalizedUnitPrice: null,
    normalizedUnit: null,
    currency: normalizeCurrency(input.currency),
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  };
  return withNormalized(snapshot);
}

/** Prix par unité de BASE (KG / LITRE / l'unité elle-même) — DÉRIVÉ, jamais l'autorité. */
export function computeNormalized(s: PricingSnapshot): Dec | null {
  if (s.basis === 'PER_BASE_UNIT' && s.priceUnit) {
    return s.amount.div(unitFactor(s.priceUnit), NORMALIZED_SCALE);
  }
  if (s.basis === 'PER_PACKAGE') {
    if (!s.packageContentAmount || !s.packageContentUnit) return null;
    return s.amount.div(s.packageContentAmount.mul(unitFactor(s.packageContentUnit)), NORMALIZED_SCALE);
  }
  if (s.basis === 'TOTAL_LOT') {
    if (!s.inventoryQuantity || !s.inventoryUnit) return null;
    return s.amount.div(s.inventoryQuantity.mul(unitFactor(s.inventoryUnit)), NORMALIZED_SCALE);
  }
  return null;
}

export function withNormalized(s: PricingSnapshot): PricingSnapshot {
  const value = computeNormalized(s);
  const refUnit = s.inventoryUnit ?? s.priceUnit ?? s.packageContentUnit;
  const unit = refUnit ? (baseUnitFor(refUnit) ?? canonUnit(refUnit)) : null;
  return { ...s, normalizedUnitPrice: value, normalizedUnit: value !== null ? unit : null };
}

/** Colonnes à écrire dans `marketplace.bids` (TOUTES, y compris les NULL : une mise à jour ne garde jamais une ancienne base). */
export function toBidColumns(s: PricingSnapshot): BidPricingColumns {
  return {
    offeredPrice: s.amount.quantize(MONEY_SCALE).toFixed(),
    offeredPriceBasis: s.basis,
    offeredPriceUnit: s.priceUnit,
    offeredPriceCurrency: s.currency,
    packageType: s.packageType,
    packageContentAmount: s.packageContentAmount ? s.packageContentAmount.quantize(3).toFixed() : null,
    packageContentUnit: s.packageContentUnit,
    normalizedUnitPrice: s.normalizedUnitPrice ? s.normalizedUnitPrice.quantize(NORMALIZED_SCALE).toFixed() : null,
    normalizedUnit: s.normalizedUnit,
    pricingSnapshotVersion: s.schemaVersion,
  };
}

// ── Relecture (bid EXISTANT) ────────────────────────────────────────────────────────────────────────────────

/**
 * Snapshot d'une ligne `bids`, ou `null` si la base n'est pas certifiée (version NULL, LEGACY_UNSPECIFIED,
 * base inconnue ou ligne malformée). `null` = NON comparable, NON attribuable. Miroir de `from_bid`.
 */
export function snapshotFromBid(row: BidPricingRow): PricingSnapshot | null {
  const version = row.pricingSnapshotVersion;
  const basis = row.offeredPriceBasis;
  if (version == null || !basis || basis === LEGACY_UNSPECIFIED) return null;
  if (!(PRICE_BASES as readonly string[]).includes(basis)) return null;
  if (version !== SNAPSHOT_SCHEMA_VERSION) return null;
  try {
    const opt = (v: string | number | null | undefined) => (v == null || v === '' ? null : D(v));
    const snap: PricingSnapshot = {
      amount: D(row.offeredPrice as string | number),
      basis: basis as PriceBasis,
      priceUnit: canonUnit(row.offeredPriceUnit),
      packageType: canonUnit(row.packageType),
      packageContentAmount: opt(row.packageContentAmount),
      packageContentUnit: canonUnit(row.packageContentUnit),
      inventoryQuantity: null,
      inventoryUnit: null,
      normalizedUnitPrice: opt(row.normalizedUnitPrice),
      normalizedUnit: canonUnit(row.normalizedUnit),
      currency: normalizeCurrency(row.offeredPriceCurrency),
      schemaVersion: version,
    };
    return snapshotIssues(snap).length === 0 ? snap : null;
  } catch {
    return null;
  }
}

/** Incohérences du snapshot (liste vide = valide). Mêmes règles que les CHECK en base et `issues()` Python. */
export function snapshotIssues(s: PricingSnapshot): string[] {
  const out: string[] = [];
  if (s.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) out.push('schema_version non supportée');
  if (!s.currency) out.push('currency manquante');
  if (!s.amount.isPositive) out.push('montant doit être > 0');
  if (s.basis === 'PER_PACKAGE') {
    if (!s.packageType) out.push('PER_PACKAGE exige package_type');
    if (!s.packageContentAmount || !s.packageContentAmount.isPositive) out.push('PER_PACKAGE exige un contenu > 0');
    if (!s.packageContentUnit) out.push('PER_PACKAGE exige package_content_unit');
  } else if (s.packageType || s.packageContentAmount || s.packageContentUnit) {
    out.push(`${s.basis} n'admet aucun conditionnement`);
  }
  if (s.basis === 'PER_BASE_UNIT' && !s.priceUnit) out.push('PER_BASE_UNIT exige price_unit');
  if (s.basis !== 'PER_BASE_UNIT' && s.priceUnit) out.push(`${s.basis} n'admet pas de price_unit`);
  if ((s.normalizedUnitPrice === null) !== (s.normalizedUnit === null)) out.push('normalized_unit_price et normalized_unit vont ensemble');
  if (s.normalizedUnitPrice && !s.normalizedUnitPrice.isPositive) out.push('normalized_unit_price doit être > 0');
  return out;
}

// ── Total, libellé, comparaison ────────────────────────────────────────────────────────────────────────────

/**
 * Total (arrondi 0,01) pour `quantity` `unit`. PER_BASE_UNIT : montant × quantité exprimée dans `price_unit` ;
 * TOTAL_LOT : le montant (le lot entier — JAMAIS × la quantité) ; PER_PACKAGE : nombre de conditionnements EXACT
 * × montant (division inexacte => erreur). Miroir de `CommercialPricingSnapshot.total_for`.
 */
export function totalFor(s: PricingSnapshot, quantity: string | number, unit: string | null): Dec {
  let qty: Dec;
  try {
    qty = D(quantity);
  } catch {
    throw new BidPricingError('quantity_invalid', 'quantité invalide');
  }
  if (!qty.isPositive) throw new BidPricingError('quantity_invalid', 'quantity doit être > 0');

  if (s.basis === 'TOTAL_LOT') return s.amount.quantize(MONEY_SCALE);

  if (s.basis === 'PER_BASE_UNIT') {
    const qtyUnit = canonUnit(unit) ?? s.priceUnit ?? '';
    if (unitFamily(qtyUnit) !== unitFamily(s.priceUnit ?? '')) {
      throw new BidPricingError('unit_incompatible', `unité ${qtyUnit} incompatible avec ${s.priceUnit}`);
    }
    // montant × qté × f(unité de la qté) / f(unité du prix) — facteurs puissances de 10 : exact
    const num = s.amount.mul(qty).mul(unitFactor(qtyUnit));
    return num.div(unitFactor(s.priceUnit ?? ''), MONEY_SCALE);
  }

  // PER_PACKAGE
  const content = (s.packageContentAmount ?? D(0)).mul(unitFactor(s.packageContentUnit ?? ''));
  if (!content.isPositive) throw new BidPricingError('package_unknown', 'contenu du conditionnement inconnu');
  const baseQty = qty.mul(unitFactor(canonUnit(unit) ?? s.packageContentUnit ?? ''));
  // nombre EXACT de conditionnements : baseQty / content doit être entier
  const s0 = Math.max(baseQty.s, content.s);
  const a = baseQty.quantize(s0);
  const b = content.quantize(s0);
  if (a.n % b.n !== BigInt(0)) {
    throw new BidPricingError('package_not_divisible', `${qty.toPlain()} ${unit} n'est pas un nombre entier de ${s.packageType}`);
  }
  const count = new Dec(a.n / b.n, 0);
  return s.amount.mul(count).quantize(MONEY_SCALE);
}

/** Total comparable d'un bid pour la quantité de l'enchère, ou `null` (jamais deviné). */
export function comparableTotal(s: PricingSnapshot, quantity: string | number, unit: string): Dec | null {
  try {
    return totalFor(s, quantity, unit);
  } catch (e) {
    if (e instanceof BidPricingError) return null;
    throw e;
  }
}

/** « 450 000 FCFA par tonne » / « 4 200 000 FCFA pour l'ensemble » / « 12 000 FCFA par caisse de 25 kg ». */
export function renderPricingLabel(s: PricingSnapshot): string {
  const money = `${fmtNum(s.amount)} FCFA`;
  if (s.basis === 'TOTAL_LOT') return `${money} pour l'ensemble`;
  if (s.basis === 'PER_PACKAGE' && s.packageContentAmount) {
    const content = Number(s.packageContentAmount.toPlain());
    return `${money} par ${(s.packageType ?? 'conditionnement').toLowerCase()} de ${fmtNum(s.packageContentAmount)} ${unitDisplay(s.packageContentUnit, content)}`;
  }
  return `${money} par ${unitDisplay(s.priceUnit)}`;
}

export const LEGACY_LABEL = 'Base de prix à préciser';

export interface BidPricingView {
  certified: boolean;
  /** Sémantique ORIGINALE du bid (jamais « /unité de l'enchère » supposé). */
  label: string;
  /** Total comparable (chaîne 2 décimales) ou null. */
  comparableTotal: string | null;
  /** « 450 FCFA/kg » — affiché EN SECOND, jamais à la place du label. */
  normalizedLabel: string | null;
  comparable: boolean;
  /** Code stable si non comparable : `bid_basis_unknown` | `not_comparable_to_auction`. */
  reason: string | null;
  snapshot: PricingSnapshot | null;
}

export function bidPricingView(row: BidPricingRow, auction: Pick<AuctionTerms, 'quantity' | 'unit'>): BidPricingView {
  const snap = snapshotFromBid(row);
  if (!snap) {
    return { certified: false, label: LEGACY_LABEL, comparableTotal: null, normalizedLabel: null, comparable: false, reason: 'bid_basis_unknown', snapshot: null };
  }
  const total = comparableTotal(snap, auction.quantity, auction.unit);
  const normalizedLabel = snap.normalizedUnitPrice && snap.normalizedUnit
    ? `${fmtNum(snap.normalizedUnitPrice)} FCFA/${unitDisplay(snap.normalizedUnit)}`
    : null;
  return {
    certified: true,
    label: renderPricingLabel(snap),
    comparableTotal: total ? total.toFixed() : null,
    normalizedLabel,
    comparable: total !== null,
    reason: total !== null ? null : 'not_comparable_to_auction',
    snapshot: snap,
  };
}

/**
 * Moins cher d'abord parmi les COMPARABLES (total, puis ancienneté, puis id : déterministe) ; les non-comparables
 * viennent APRÈS, dans l'ordre d'arrivée — jamais classés sur un montant brut.
 */
export function rankByComparableTotal<T extends { view: BidPricingView; createdAt?: Date | string | null; id: string }>(items: T[]): T[] {
  const ts = (i: T) => (i.createdAt ? new Date(i.createdAt).getTime() : 0);
  const byArrival = (a: T, b: T) => ts(a) - ts(b) || a.id.localeCompare(b.id);
  const comparable = items
    .filter((i) => i.view.comparable && i.view.comparableTotal !== null)
    .sort((a, b) => D(a.view.comparableTotal as string).cmp(D(b.view.comparableTotal as string)) || byArrival(a, b));
  const rest = items.filter((i) => !(i.view.comparable && i.view.comparableTotal !== null)).sort(byArrival);
  return [...comparable, ...rest];
}

/**
 * Plafond de l'acheteur (`maxPricePerUnit`, exprimé PAR unité de l'enchère) appliqué au total comparable :
 * total ≤ plafond × quantité. Ne compare jamais un montant brut au plafond.
 */
export function exceedsCeiling(total: Dec, maxPricePerUnit: string | number | null | undefined, quantity: string | number): boolean {
  if (maxPricePerUnit == null || maxPricePerUnit === '') return false;
  return total.cmp(D(maxPricePerUnit).mul(D(quantity))) > 0;
}

// ── Forme JSON (orders.award_pricing_snapshot) ─────────────────────────────────────────────────────────────

const plain = (d: Dec | null): string | null => (d ? d.toPlain() : null);

/** Miroir de `CommercialPricingSnapshot.to_dict()` (montants en CHAÎNES, jamais en JSON number). */
export function snapshotToDict(s: PricingSnapshot): Record<string, unknown> {
  return {
    schema_version: s.schemaVersion,
    currency: s.currency,
    commercial_price_amount: plain(s.amount),
    price_basis: s.basis,
    price_unit: s.priceUnit,
    package_type: s.packageType,
    package_content_amount: plain(s.packageContentAmount),
    package_content_unit: s.packageContentUnit,
    commercial_quantity_amount: null,
    commercial_quantity_unit: null,
    inventory_quantity_amount: null,
    inventory_quantity_unit: null,
    normalized_unit_price: plain(s.normalizedUnitPrice),
    normalized_unit: s.normalizedUnit,
    price_source: null,
  };
}
