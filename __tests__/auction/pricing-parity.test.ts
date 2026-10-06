// @vitest-environment node
/**
 * PARITÉ Python <-> web du contrat de prix d'un bid (Phase B2c.1).
 *
 * Les vecteurs sont GÉNÉRÉS par le moteur Python (`backend/scripts/generate_web_pricing_parity_vectors.py`) ; le
 * même fichier est rejoué côté backend (`tests/unit/test_web_pricing_parity.py`). Si le web calcule un total, un
 * libellé, des colonnes, une empreinte ou un snapshot gelé différents de Python, ce test échoue.
 */
import { describe, expect, it } from 'vitest';
import vectors from './fixtures/pricing-parity-vectors.json';
import {
  BidPricingError,
  bidPricingView,
  buildBidPricing,
  comparableTotal,
  renderPricingLabel,
  snapshotFromBid,
  toBidColumns,
  type BidPricingRow,
} from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf, frozenSnapshotOf, idempotencyKeyOf } from '@/features/auction/pricing/award-decision';
import { D } from '@/features/auction/pricing/fixed-decimal';

type Case = (typeof vectors)['cases'][number];

const plain = (v: string | null | undefined) => (v == null ? null : D(v).toPlain());

const termsOf = (a: { id: string; buyer_id: string; quantity: string; unit: string }) => ({ id: a.id, buyerId: a.buyer_id, quantity: a.quantity, unit: a.unit });

function rowFromColumns(c: ReturnType<typeof toBidColumns>): BidPricingRow & { id: string; producerId: string } {
  return { id: 'X', producerId: 'Y', ...c };
}

describe('parité web/Python — vecteurs générés par le moteur Python', () => {
  it('le fichier de vecteurs vient bien de Python et n\'est pas vide', () => {
    expect(vectors.engine).toBe('python');
    expect(vectors.cases.length).toBeGreaterThanOrEqual(15);
  });

  for (const tc of vectors.cases as Case[]) {
    const { auction, bid, expected } = tc as Case & { expected: Record<string, any> };
    it(tc.name, () => {
      const input = {
        amount: bid.amount,
        basis: bid.basis,
        priceUnit: bid.price_unit,
        packageType: bid.package_type,
        packageContentAmount: bid.package_content_amount,
        packageContentUnit: bid.package_content_unit,
      };

      if (!expected.build_ok) {
        expect(() => buildBidPricing(input, auction, { allowPackage: true })).toThrow(BidPricingError);
        return;
      }

      // 1. colonnes persistées identiques
      const snap = buildBidPricing(input, auction, { allowPackage: true });
      const cols = toBidColumns(snap);
      const exp = expected.columns as Record<string, unknown>;
      expect(cols.offeredPriceBasis).toBe(exp.offeredPriceBasis);
      expect(cols.offeredPriceUnit).toBe(exp.offeredPriceUnit);
      expect(cols.offeredPriceCurrency).toBe(exp.offeredPriceCurrency);
      expect(cols.packageType).toBe(exp.packageType);
      expect(cols.packageContentUnit).toBe(exp.packageContentUnit);
      expect(cols.normalizedUnit).toBe(exp.normalizedUnit);
      expect(cols.pricingSnapshotVersion).toBe(exp.pricingSnapshotVersion);
      expect(plain(cols.offeredPrice)).toBe(exp.offeredPrice);
      expect(plain(cols.packageContentAmount)).toBe(exp.packageContentAmount);
      expect(plain(cols.normalizedUnitPrice)).toBe(exp.normalizedUnitPrice);

      // 2. relecture depuis les colonnes (ce que le serveur fait) : libellé + total comparable
      const row = rowFromColumns(cols);
      const reread = snapshotFromBid(row);
      expect(reread).not.toBeNull();
      expect(renderPricingLabel(reread!)).toBe(expected.label);
      const total = comparableTotal(reread!, auction.quantity, auction.unit);
      expect(total ? total.toPlain() : null).toBe(expected.comparable_total);

      // 3. décision d'attribution : total, empreinte, clé d'idempotence, snapshot gelé
      if (!expected.award_ok) {
        expect(() => buildAwardDecision(row, termsOf(auction))).toThrow(expect.objectContaining({ code: expected.award_error }));
        return;
      }
      const decision = buildAwardDecision({ ...row, id: bid.id, producerId: bid.producer_id }, termsOf(auction));
      expect(decision.awardTotal.toPlain()).toBe(expected.award_total);
      expect(fingerprintOf(decision)).toBe(expected.fingerprint);
      expect(idempotencyKeyOf(decision)).toBe(expected.idempotency_key);
      expect(frozenSnapshotOf(decision)).toEqual(expected.frozen_snapshot);
    });
  }

  it('un bid legacy (sans base certifiée) est non comparable et non attribuable, comme côté Python', () => {
    for (const lc of vectors.legacy_cases) {
      const view = bidPricingView({ offeredPrice: lc.legacy_bid.offeredPrice }, lc.auction);
      expect(view.certified).toBe(lc.expected.certified);
      expect(view.comparable).toBe(lc.expected.comparable);
      expect(() => buildAwardDecision({ ...lc.legacy_bid, producerId: lc.legacy_bid.producer_id } as never, termsOf(lc.auction)))
        .toThrow(expect.objectContaining({ code: lc.expected.award_error }));
    }
  });
});
