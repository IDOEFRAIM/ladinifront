// @vitest-environment node
/**
 * Noyau d'attribution (`services/auction-award-core.ts`) — verrou optimiste, unicité de la commande, total et
 * instantané FIGÉS venant de la `CertifiedAwardDecision` (jamais `offeredPrice × quantité`).
 */
import { describe, it, expect, vi } from 'vitest';
import { buildBidPricing, toBidColumns } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf } from '@/features/auction/pricing/award-decision';

vi.mock('drizzle-orm', () => ({ eq: () => ({}), and: () => ({}), ne: () => ({}), sql: (s: TemplateStringsArray, ...v: unknown[]) => ({ sql: s, v }) }));
vi.mock('@/src/db/schema', () => ({
  auctions: { __n: 'auctions' }, bids: { __n: 'bids' }, orders: { __n: 'orders' },
  buyerProfiles: { __n: 'buyerProfiles' }, users: { __n: 'users' }, stocks: { __n: 'stocks' }, stockMovements: { __n: 'stockMovements' },
}));

function makeChain(returning: () => Promise<unknown[]> | unknown[]) {
  const c: Record<string, unknown> = {};
  c.set = () => c;
  c.where = () => c;
  c.values = () => c;
  c.returning = async () => returning();
  return c;
}

const AUCTION = { id: 'a1', buyerId: 'bp1', quantity: '10', unit: 'TONNE', status: 'OPEN', version: 3, targetZoneId: null };
const decision = buildAwardDecision(
  { id: 'bid1', producerId: 'p1', ...toBidColumns(buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION)) },
  AUCTION,
);

function makeTx(opts: { versionMatches?: boolean; existingOrder?: { id: string } | null } = {}) {
  const versionMatches = opts.versionMatches ?? true;
  const insertedOrders: Record<string, unknown>[] = [];
  const tx = {
    update: (table: { __n: string }) => {
      if (table.__n === 'auctions') return makeChain(() => (versionMatches ? [{ id: AUCTION.id }] : []));
      return makeChain(() => [{ producerId: 'loser1' }, { producerId: 'loser2' }]); // bids losers update
    },
    insert: (table: { __n: string }) => makeChain(() => {
      if (table.__n === 'orders') {
        const row = { id: 'order1' };
        insertedOrders.push(row);
        return [row];
      }
      return [{}];
    }),
    query: {
      orders: { findFirst: async () => opts.existingOrder ?? null },
      buyerProfiles: { findFirst: async () => ({ id: 'bp1', userId: 'u1' }) },
      users: { findFirst: async () => ({ name: 'Acheteur Test', phone: '+22670000000' }) },
      stocks: { findFirst: async () => null },
    },
    _insertedOrders: insertedOrders,
  };
  return tx as never;
}

describe('closeAuctionOnBid', () => {
  it('crée UNE commande avec le total et l\'instantané de la décision certifiée (jamais offeredPrice × quantité)', async () => {
    const { closeAuctionOnBid } = await import('@/features/auction/services/auction-award-core');
    const tx = makeTx();
    const result = await closeAuctionOnBid(tx, {
      auction: AUCTION,
      winnerBid: { id: 'bid1', producerId: 'p1', linkedStockId: null },
      decision,
      finalStatus: 'AWARDED',
      stockReason: 'test',
    });
    expect(result.orderId).toBe('order1');
    expect(result.totalAmount).toBe('4500000.00');
    expect(result.fingerprint).toBe(fingerprintOf(decision));
    expect(result.loserProducerIds.sort()).toEqual(['loser1', 'loser2']);
  });

  it('verrou optimiste : version déjà avancée (0 ligne affectée) -> AwardConflict(concurrent_update)', async () => {
    const { closeAuctionOnBid, AwardConflict } = await import('@/features/auction/services/auction-award-core');
    const tx = makeTx({ versionMatches: false });
    await expect(
      closeAuctionOnBid(tx, { auction: AUCTION, winnerBid: { id: 'bid1', producerId: 'p1', linkedStockId: null }, decision, finalStatus: 'AWARDED', stockReason: 'x' }),
    ).rejects.toBeInstanceOf(AwardConflict);
  });

  it('une commande existe déjà pour cette enchère -> AwardConflict(order_exists), pas de doublon', async () => {
    const { closeAuctionOnBid, AwardConflict } = await import('@/features/auction/services/auction-award-core');
    const tx = makeTx({ existingOrder: { id: 'order-already' } });
    const err = await closeAuctionOnBid(tx, { auction: AUCTION, winnerBid: { id: 'bid1', producerId: 'p1', linkedStockId: null }, decision, finalStatus: 'AWARDED', stockReason: 'x' }).catch((e) => e);
    expect(err).toBeInstanceOf(AwardConflict);
    expect((err as InstanceType<typeof AwardConflict>).code).toBe('order_exists');
  });
});
