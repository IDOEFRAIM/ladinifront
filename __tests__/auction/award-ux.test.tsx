// @vitest-environment jsdom
/**
 * UI d'attribution (Phase B2c.2) : liste des offres, modale de confirmation, et le parcours complet côté
 * `AuctionClient` (buyer opens auction -> sees certified bids -> selects -> confirms -> award service called with
 * expectedFingerprint -> Order -> UI success). Le vrai réseau est simulé via `serverAward`/`fetch` mockés — pas de
 * DB réelle (voir aussi `__tests__/auction/auction-award-core.test.ts` pour le noyau serveur, mocké lui aussi).
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AuctionBidList from '@/features/auction/components/AuctionBidList';
import AuctionAwardConfirm from '@/features/auction/components/AuctionAwardConfirm';
import AuctionClient from '@/features/auction/components/AuctionClient';
import type { Auction, AuctionBid } from '@/features/auction/types/auction.types';
import { codedError } from '@/lib/errors';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const AUCTION: Auction = { id: 'a1', status: 'OPEN', deadline: null, maxPricePerUnit: 500000, quantity: '10', unit: 'TONNE' };

const CERTIFIED_BID: AuctionBid = {
  id: 'bid-cert', producerName: 'Gilbert', offeredPrice: 450000, offeredPriceBasis: 'PER_BASE_UNIT',
  pricingLabel: '450 000 FCFA par tonne', pricingCertified: true, comparableTotal: '4500000.00',
  comparable: true, award: { fingerprint: 'fp-1', total: '4500000.00' }, awardable: true, status: 'PENDING',
};

const LEGACY_BID: AuctionBid = {
  id: 'bid-legacy', producerName: 'Awa', offeredPrice: 400000, offeredPriceBasis: null,
  pricingLabel: 'Base de prix à préciser', pricingCertified: false, comparableTotal: null,
  comparable: false, award: null, awardable: false, status: 'PENDING',
};

const TOTAL_LOT_BID: AuctionBid = {
  id: 'bid-lot', producerName: 'Sana', offeredPrice: 4200000, offeredPriceBasis: 'TOTAL_LOT',
  pricingLabel: '4 200 000 FCFA pour l\'ensemble', pricingCertified: true, comparableTotal: '4200000.00',
  comparable: true, award: { fingerprint: 'fp-2', total: '4200000.00' }, awardable: true, status: 'PENDING',
};

describe('A/E — AuctionBidList : bouton Award et libellés propres à chaque bid', () => {
  it('A — un bid certifié ET comparable affiche un bouton "Attribuer" ACTIF', () => {
    render(<AuctionBidList auction={AUCTION} bids={[CERTIFIED_BID]} loading={false} viewerCanAward onSelectForAward={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Attribuer' });
    expect(btn).toBeEnabled();
  });

  it('B — un bid legacy (base inconnue) a un bouton ABSENT ou DÉSACTIVÉ, jamais cliquable', () => {
    render(<AuctionBidList auction={AUCTION} bids={[LEGACY_BID]} loading={false} viewerCanAward onSelectForAward={() => {}} />);
    expect(screen.getByText('Base de prix à préciser')).toBeInTheDocument();
    const btn = screen.queryByRole('button', { name: 'Attribuer' });
    if (btn) expect(btn).toBeDisabled();
  });

  it('E — offres mixtes : chaque ligne affiche SA PROPRE base, jamais celle du voisin', () => {
    render(<AuctionBidList auction={AUCTION} bids={[CERTIFIED_BID, TOTAL_LOT_BID, LEGACY_BID]} loading={false} viewerCanAward onSelectForAward={() => {}} />);
    expect(screen.getByText('450 000 FCFA par tonne')).toBeInTheDocument();
    expect(screen.getByText('4 200 000 FCFA pour l\'ensemble')).toBeInTheDocument();
    expect(screen.getByText('Base de prix à préciser')).toBeInTheDocument();
    // Attribuer actif pour les 2 certifiés seulement
    expect(screen.getAllByRole('button', { name: 'Attribuer' }).filter((b) => !(b as HTMLButtonElement).disabled)).toHaveLength(2);
  });

  it('sans droit d\'attribution (viewerCanAward=false), aucun bouton n\'apparaît du tout', () => {
    render(<AuctionBidList auction={AUCTION} bids={[CERTIFIED_BID]} loading={false} viewerCanAward={false} onSelectForAward={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Attribuer' })).not.toBeInTheDocument();
  });
});

describe('C/D — AuctionAwardConfirm : ce qui est affiché == ce qui sera envoyé', () => {
  it('C — PER_BASE_UNIT : offre, quantité de l\'enchère et total exacts, jamais recalculés', () => {
    render(
      <AuctionAwardConfirm
        auction={AUCTION}
        target={{ bidId: 'bid-cert', producerName: 'Gilbert', pricingLabel: '450 000 FCFA par tonne', comparableTotal: '4500000.00', fingerprint: 'fp-1' }}
        submitting={false} error={null} onCancel={() => {}} onConfirm={() => {}}
      />,
    );
    expect(screen.getByText(/Gilbert/)).toBeInTheDocument();
    expect(screen.getByText('450 000 FCFA par tonne')).toBeInTheDocument();
    expect(screen.getByText('10 tonnes')).toBeInTheDocument();
    expect(screen.getByText('4500000.00 FCFA')).toBeInTheDocument();
  });

  it('D — TOTAL_LOT : le total affiché est le montant du lot, jamais ×10 (interdit: 42 000 000)', () => {
    render(
      <AuctionAwardConfirm
        auction={AUCTION}
        target={{ bidId: 'bid-lot', producerName: 'Sana', pricingLabel: '4 200 000 FCFA pour l\'ensemble', comparableTotal: '4200000.00', fingerprint: 'fp-2' }}
        submitting={false} error={null} onCancel={() => {}} onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('4 200 000 FCFA pour l\'ensemble')).toBeInTheDocument();
    expect(screen.getByText('4200000.00 FCFA')).toBeInTheDocument();
    expect(screen.queryByText(/42[\s ]?000[\s ]?000/)).not.toBeInTheDocument();
  });

  it('rien ne s\'affiche quand target est null (pas de modale fantôme)', () => {
    render(<AuctionAwardConfirm auction={AUCTION} target={null} submitting={false} error={null} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

function mockFetchFor(bids: AuctionBid[], viewerCanAward: boolean, awardHandler: (body: unknown) => Response | Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/bids') && (!init || init.method === undefined)) {
      return new Response(JSON.stringify({ data: { auctionId: 'a1', auctionStatus: 'OPEN', totalBids: bids.length, bestBidPrice: null, viewerCanAward, bids } }), { status: 200 });
    }
    if (url.includes('/award') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body));
      return awardHandler(body);
    }
    return new Response(JSON.stringify({ data: null }), { status: 200 });
  }));
}

describe('Parcours complet : ouverture -> sélection -> confirmation -> award -> succès (mock service)', () => {
  it('F — fingerprint périmé (award_terms_changed) : PAS d\'attribution, confirmation fermée, nouvelle sélection obligatoire', async () => {
    mockFetchFor([CERTIFIED_BID], true, () => new Response(JSON.stringify({ error: 'Les termes ont changé', code: 'award_terms_changed' }), { status: 400 }));
    render(<AuctionClient auctionId="a1" initialAuction={AUCTION} initialProducers={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Attribuer' }));
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'attribution" }));

    await waitFor(() => expect(screen.getByText(/offre a changé depuis votre confirmation/)).toBeInTheDocument());
    // Pas d'attribution effectuée : aucun bandeau de succès n'apparaît.
    expect(screen.queryByTestId('award-success')).not.toBeInTheDocument();
  });

  it('H — enchère déjà attribuée ailleurs (concurrence) : pas de double attribution, état final propre', async () => {
    mockFetchFor([CERTIFIED_BID], true, () => new Response(JSON.stringify({ error: 'déjà attribuée', code: 'auction_not_open' }), { status: 400 }));
    render(<AuctionClient auctionId="a1" initialAuction={AUCTION} initialProducers={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Attribuer' }));
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'attribution" }));

    await waitFor(() => expect(screen.getByText(/déjà été attribuée ou fermée/)).toBeInTheDocument());
    expect(screen.queryByTestId('award-success')).not.toBeInTheDocument();
  });

  it('parcours nominal : succès affiche le gagnant, le prix, la quantité et le total EXACTS renvoyés par le service', async () => {
    const serverAward = vi.fn(async () => ({
      auctionId: 'a1', winnerBidId: 'bid-cert', status: 'AWARDED', orderId: 'order1',
      totalAmount: '4500000.00', pricingLabel: '450 000 FCFA par tonne', fingerprint: 'fp-1', idempotent: false,
    }));
    mockFetchFor([CERTIFIED_BID], true, () => new Response(JSON.stringify({ data: null }), { status: 200 }));
    render(<AuctionClient auctionId="a1" initialAuction={AUCTION} initialProducers={[]} serverAward={serverAward} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Attribuer' }));
    fireEvent.click(screen.getByRole('button', { name: "Confirmer l'attribution" }));

    await waitFor(() => expect(screen.getByTestId('award-success')).toBeInTheDocument());
    expect(serverAward).toHaveBeenCalledWith('a1', { winnerBidId: 'bid-cert', expectedFingerprint: 'fp-1' });
    const successCard = screen.getByTestId('award-success');
    expect(within(successCard).getByText(/Gilbert/)).toBeInTheDocument();
    expect(within(successCard).getByText(/4500000.00 FCFA/)).toBeInTheDocument();
  });

  it('G — double-clic sur Confirmer : le service d\'attribution n\'est appelé QU\'UNE fois', async () => {
    let resolveAward: (v: unknown) => void = () => {};
    const serverAward = vi.fn(() => new Promise((resolve) => { resolveAward = resolve; }));
    mockFetchFor([CERTIFIED_BID], true, () => new Response(JSON.stringify({ data: null }), { status: 200 }));
    render(<AuctionClient auctionId="a1" initialAuction={AUCTION} initialProducers={[]} serverAward={serverAward} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Attribuer' }));
    const confirmBtn = screen.getByRole('button', { name: "Confirmer l'attribution" });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn); // double-clic synchrone, avant tout re-render

    resolveAward({ auctionId: 'a1', winnerBidId: 'bid-cert', status: 'AWARDED', orderId: 'order1', totalAmount: '4500000.00', pricingLabel: null, fingerprint: 'fp-1', idempotent: false });
    await waitFor(() => expect(screen.getByText('Enchère attribuée')).toBeInTheDocument());
    expect(serverAward).toHaveBeenCalledTimes(1);
  });
});

describe('codedError — le code serveur survit au transport HTTP (nécessaire pour F/H)', () => {
  it('porte bien `.code` sur l\'erreur construite', () => {
    const e = codedError('award_terms_changed', 'msg');
    expect(e.code).toBe('award_terms_changed');
  });
});
