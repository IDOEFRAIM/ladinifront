import AuctionClient from '@/components/auction/AuctionClient';
import { fetchAuctionById, fetchEligibleProducers, submitAuctionBid } from '@/app/actions/auctions.server';

export default async function AuctionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const auctionRaw = await fetchAuctionById(id);
  const producersRes = await fetchEligibleProducers({ auctionId: id });
  const producers = producersRes && producersRes.success ? producersRes.data : [];

  const auction = auctionRaw
    ? {
        ...auctionRaw,
        deadline: auctionRaw.deadline ? new Date(auctionRaw.deadline).toISOString() : null,
        createdAt: auctionRaw.createdAt ? new Date(auctionRaw.createdAt).toISOString() : undefined,
      }
    : null;

  async function serverLoad(auctionId: string): Promise<{ auction: any | null; producers: any[] }> {
    'use server'
    const aRaw = await fetchAuctionById(auctionId);
    const pRes = await fetchEligibleProducers({ auctionId });
    const pList = pRes && pRes.success && pRes.data ? pRes.data : [];
    const a = aRaw
      ? {
          ...aRaw,
          deadline: aRaw.deadline ? new Date(aRaw.deadline).toISOString() : null,
          createdAt: aRaw.createdAt ? new Date(aRaw.createdAt).toISOString() : undefined,
        }
      : null;
    return { auction: a, producers: pList };
  }

  async function serverSubmit(auctionId: string, payload: { offeredPrice: number }) {
    'use server'
    await submitAuctionBid({ auctionId, offeredPrice: payload.offeredPrice });
    return { ok: true };
  }

  return <AuctionClient auctionId={id} initialAuction={auction} initialProducers={producers} serverLoad={serverLoad} serverSubmit={serverSubmit} />;
}
