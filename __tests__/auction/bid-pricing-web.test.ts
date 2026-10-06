// @vitest-environment node
/**
 * Scénarios dorés WEB (Phase B2c.1, B19-B24) — au niveau du moteur pur (`features/auction/pricing/*`), sans DB.
 * Le chemin DB (soumission, attribution, idempotence, règlement) est exercé séparément par
 * `__tests__/auction/auction-award-core.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { buildBidPricing, bidPricingView, rankByComparableTotal, renderPricingLabel, snapshotFromBid, toBidColumns } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf, idempotencyKeyOf } from '@/features/auction/pricing/award-decision';

const AUCTION = { id: 'a1', buyerId: 'b1', quantity: '10', unit: 'TONNE' };

describe('B19 — 450000/TONNE sur 10 TONNE', () => {
  it('certifie, affiche "450 000 FCFA par tonne", total 4 500 000, attribution cohérente', () => {
    const snap = buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION);
    expect(renderPricingLabel(snap)).toBe('450 000 FCFA par tonne');
    const row = { id: 'bid1', producerId: 'p1', ...toBidColumns(snap) };
    const decision = buildAwardDecision(row, AUCTION);
    expect(decision.awardTotal.toPlain()).toBe('4500000');
  });
});

describe('B20 — 4 200 000 TOTAL_LOT sur 10 TONNE : aucune multiplication ×10', () => {
  it('total = 4 200 000, jamais 42 000 000', () => {
    const snap = buildBidPricing({ amount: 4200000, basis: 'TOTAL_LOT' }, AUCTION);
    const row = { id: 'bid2', producerId: 'p2', ...toBidColumns(snap) };
    const decision = buildAwardDecision(row, AUCTION);
    expect(decision.awardTotal.toPlain()).toBe('4200000');
  });
});

describe('B21 — A (450000/TONNE=4.5M) vs B (4.2M TOTAL_LOT) : B est moins cher', () => {
  it('rankByComparableTotal classe B avant A', () => {
    const a = { id: 'A', createdAt: new Date(0), view: bidPricingView({ id: 'A', producerId: 'p', ...toBidColumns(buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION)) }, AUCTION) };
    const b = { id: 'B', createdAt: new Date(1), view: bidPricingView({ id: 'B', producerId: 'p', ...toBidColumns(buildBidPricing({ amount: 4200000, basis: 'TOTAL_LOT' }, AUCTION)) }, AUCTION) };
    const ranked = rankByComparableTotal([a, b]);
    expect(ranked.map((r) => r.id)).toEqual(['B', 'A']);
  });
});

describe('B22 — legacy (400000, base inconnue) vs certified (4.2M TOTAL_LOT) : legacy ne peut jamais gagner', () => {
  it('le bid legacy est non comparable et vient après, quel que soit son montant brut', () => {
    const legacy = { id: 'L', createdAt: new Date(0), view: bidPricingView({ offeredPrice: '400000' }, AUCTION) };
    const certified = { id: 'C', createdAt: new Date(1), view: bidPricingView({ id: 'C', producerId: 'p', ...toBidColumns(buildBidPricing({ amount: 4200000, basis: 'TOTAL_LOT' }, AUCTION)) }, AUCTION) };
    const ranked = rankByComparableTotal([legacy, certified]);
    expect(ranked.map((r) => r.id)).toEqual(['C', 'L']);
    expect(legacy.view.certified).toBe(false);
    expect(legacy.view.comparable).toBe(false);
    expect(() => buildAwardDecision({ offeredPrice: '400000' } as never, AUCTION)).toThrow(expect.objectContaining({ code: 'bid_basis_unknown' }));
  });
});

describe('B23 — 450000/TONNE affiché sur une enchère en 1000 KG : comparable, libellé inchangé', () => {
  it('comparable_total = 450000 (450000/TONNE × 1000 KG = 450000), label reste "par tonne"', () => {
    const auctionKg = { ...AUCTION, quantity: '1000', unit: 'KG' };
    const snap = buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, auctionKg);
    const row = { id: 'bidE', producerId: 'pE', ...toBidColumns(snap) };
    const view = bidPricingView(row, auctionKg);
    expect(view.label).toBe('450 000 FCFA par tonne');
    expect(view.comparableTotal).toBe('450000.00');
  });
});

describe('B24 — double clic : même décision => même empreinte et même clé d\'idempotence', () => {
  it('fingerprintOf/idempotencyKeyOf sont déterministes pour des termes identiques', () => {
    const snap = buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION);
    const row = { id: 'bidF', producerId: 'pF', ...toBidColumns(snap) };
    const d1 = buildAwardDecision(row, AUCTION);
    const d2 = buildAwardDecision(row, AUCTION);
    expect(fingerprintOf(d1)).toBe(fingerprintOf(d2));
    expect(idempotencyKeyOf(d1)).toBe(idempotencyKeyOf(d2));
  });

  it('des termes CHANGÉS (autre montant) produisent une empreinte DIFFÉRENTE — jamais un rejeu silencieux', () => {
    const snapA = buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION);
    const snapB = buildBidPricing({ amount: 460000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION);
    const rowA = { id: 'bidF', producerId: 'pF', ...toBidColumns(snapA) };
    const rowB = { id: 'bidF', producerId: 'pF', ...toBidColumns(snapB) };
    expect(fingerprintOf(buildAwardDecision(rowA, AUCTION))).not.toBe(fingerprintOf(buildAwardDecision(rowB, AUCTION)));
  });
});

describe('B16/B6 — un bid neuf sans base est refusé, jamais écrit', () => {
  it('buildBidPricing lève basis_required quand basis est vide', () => {
    expect(() => buildBidPricing({ amount: 450000, basis: '' }, AUCTION)).toThrowError(/basis_required|La base du prix/);
  });

  it('snapshotFromBid renvoie null pour une ligne LEGACY_UNSPECIFIED (jamais "par unité de l\'enchère")', () => {
    expect(snapshotFromBid({ offeredPrice: '450000', offeredPriceBasis: 'LEGACY_UNSPECIFIED', pricingSnapshotVersion: null })).toBeNull();
    expect(snapshotFromBid({ offeredPrice: '450000' })).toBeNull();
  });
});

describe('B17 — validation serveur (jamais seulement côté UI)', () => {
  it('PER_BASE_UNIT sans price_unit est refusé', () => {
    expect(() => buildBidPricing({ amount: 1, basis: 'PER_BASE_UNIT' }, AUCTION)).toThrow();
  });
  it('un montant <= 0 est refusé', () => {
    expect(() => buildBidPricing({ amount: 0, basis: 'TOTAL_LOT' }, AUCTION)).toThrow();
  });
  it('une unité de prix incompatible avec l\'enchère (LITRE sur une enchère en KG) est refusée', () => {
    expect(() => buildBidPricing({ amount: 1, basis: 'PER_BASE_UNIT', priceUnit: 'LITRE' }, { ...AUCTION, unit: 'KG' })).toThrow();
  });
});
