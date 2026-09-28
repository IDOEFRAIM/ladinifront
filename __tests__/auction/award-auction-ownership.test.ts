// @vitest-environment node
/**
 * Ownership et revalidation de fingerprint dans `services/auction-award.ts::awardAuction` (Phase B2c.2, étape 17/18).
 *
 * Même si le bouton "Attribuer" est masqué côté UI pour un non-propriétaire, un appel manuel (REST direct, script)
 * doit rester refusé par le SERVEUR — l'UI n'est jamais l'autorité. `services/auction-award-core.ts` (le noyau de
 * transaction lui-même) est mocké ici : il est déjà verrouillé par `auction-award-core.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildBidPricing, toBidColumns } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf } from '@/features/auction/pricing/award-decision';

const AUCTION_TERMS = { id: 'a1', buyerId: 'bp-owner', quantity: '10', unit: 'TONNE' };
const CERTIFIED_BID_ROW = { id: 'bid1', producerId: 'p1', ...toBidColumns(buildBidPricing({ amount: 450000, basis: 'PER_BASE_UNIT', priceUnit: 'TONNE' }, AUCTION_TERMS)) };
const DECISION = buildAwardDecision(CERTIFIED_BID_ROW, AUCTION_TERMS);
const FINGERPRINT = fingerprintOf(DECISION);

const currentUserId = { value: 'u-owner' };
vi.mock('@/lib/get-userId', () => ({ default: async () => currentUserId.value }));
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => undefined) }));
vi.mock('@/features/auction/services/auction-award-notify', () => ({ notifyAwardOutcome: vi.fn(async () => undefined) }));

const closeAuctionOnBid = vi.fn(async (..._args: unknown[]) => ({ orderId: 'order1', totalAmount: '4500000.00', fingerprint: FINGERPRINT, loserProducerIds: [] as string[] }));
vi.mock('@/features/auction/services/auction-award-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/auction/services/auction-award-core')>();
  return { ...actual, closeAuctionOnBid: (...a: Parameters<typeof actual.closeAuctionOnBid>) => closeAuctionOnBid(...a) };
});

// L'AUCTION appartient à `bp-owner` (buyer_profiles.id). `auctionBuyerRow` simule la convention historique :
// certaines lignes stockent directement un user id, d'autres un buyer_profiles.id (voir services/auction-award.ts).
const state = {
  auction: { id: 'a1', buyerId: 'bp-owner', status: 'OPEN', version: 1, quantity: '10', unit: 'TONNE', targetZoneId: null },
  bid: { ...CERTIFIED_BID_ROW, auctionId: 'a1', status: 'PENDING' } as Record<string, unknown>,
  ownerProfile: { id: 'bp-owner' } as { id: string } | null,
};

vi.mock('@/src/db', () => ({
  db: {
    query: {
      auctions: { findFirst: async () => state.auction },
      users: { findFirst: async () => ({ id: currentUserId.value, role: 'BUYER' }) },
      buyerProfiles: { findFirst: async () => state.ownerProfile },
      bids: { findFirst: async () => state.bid },
      orders: { findFirst: async () => null },
    },
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb({
      query: {
        auctions: { findFirst: async () => state.auction },
        users: { findFirst: async () => ({ id: currentUserId.value, role: 'BUYER' }) },
        buyerProfiles: { findFirst: async () => state.ownerProfile },
        bids: { findFirst: async () => state.bid },
        orders: { findFirst: async () => null },
      },
    }),
  },
}));
vi.mock('@/src/db/schema', () => ({ auctions: {}, bids: {}, orders: {}, buyerProfiles: {}, users: {} }));
vi.mock('drizzle-orm', () => ({ eq: () => ({}), and: () => ({}) }));

beforeEach(() => {
  closeAuctionOnBid.mockClear();
  currentUserId.value = 'u-owner';
  state.ownerProfile = { id: 'bp-owner' };
});

describe('ownership — un utilisateur qui ne possède pas l\'enchère ne peut pas attribuer', () => {
  it('userId ne correspond ni à buyerId ni au profil du buyer -> forbidden, AUCUNE écriture', async () => {
    currentUserId.value = 'u-someone-else';
    state.ownerProfile = null; // ce user n'a pas de profil acheteur du tout
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: FINGERPRINT });
    expect(res).toMatchObject({ success: false, code: 'forbidden' });
    expect(closeAuctionOnBid).not.toHaveBeenCalled();
  });

  it('userId a un profil acheteur mais qui n\'est PAS le propriétaire de cette enchère -> forbidden', async () => {
    currentUserId.value = 'u-other-buyer';
    state.ownerProfile = { id: 'bp-not-the-owner' };
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: FINGERPRINT });
    expect(res).toMatchObject({ success: false, code: 'forbidden' });
    expect(closeAuctionOnBid).not.toHaveBeenCalled();
  });

  it('propriétaire via buyerId == userId (convention historique) -> autorisé', async () => {
    currentUserId.value = 'bp-owner'; // buyerId stocke directement un identifiant utilisateur
    state.ownerProfile = null;
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: FINGERPRINT });
    expect(res.success).toBe(true);
    expect(closeAuctionOnBid).toHaveBeenCalledTimes(1);
  });

  it('propriétaire via buyerId == profile.id (convention Drizzle canonique) -> autorisé', async () => {
    currentUserId.value = 'u-owner';
    state.ownerProfile = { id: 'bp-owner' };
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: FINGERPRINT });
    expect(res.success).toBe(true);
    expect(closeAuctionOnBid).toHaveBeenCalledTimes(1);
  });
});

describe('fingerprint — étape 6/7 : jamais recalculé côté serveur autrement qu\'à partir du bid courant', () => {
  it('un expectedFingerprint qui ne correspond pas aux termes actuels du bid est refusé (award_terms_changed)', async () => {
    currentUserId.value = 'u-owner';
    state.ownerProfile = { id: 'bp-owner' };
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: 'fp-not-matching-anything' });
    expect(res).toMatchObject({ success: false, code: 'award_terms_changed' });
    expect(closeAuctionOnBid).not.toHaveBeenCalled();
  });

  it('un bid legacy (base non certifiée) est refusé — jamais attribué même avec un fingerprint fourni', async () => {
    currentUserId.value = 'u-owner';
    state.ownerProfile = { id: 'bp-owner' };
    state.bid = { id: 'bid1', producerId: 'p1', auctionId: 'a1', status: 'PENDING', offeredPrice: '400000', offeredPriceBasis: null, pricingSnapshotVersion: null };
    const { awardAuction } = await import('@/features/auction/services/auction-award');
    const res = await awardAuction({ auctionId: 'a1', winnerBidId: 'bid1', expectedFingerprint: FINGERPRINT });
    expect(res).toMatchObject({ success: false, code: 'bid_basis_unknown' });
    expect(closeAuctionOnBid).not.toHaveBeenCalled();
  });
});
