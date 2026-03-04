import AuctionClient from '@/components/auction/AuctionClient';

export default function AuctionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  return <AuctionClient auctionId={id} />;
}
