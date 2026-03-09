import NewAuctionClient from '@/components/auction/NewAuctionClient';

export default async function NewAuctionPage() {
  // bind server action for creating auction
  let serverCreateAuction = undefined;
  try {
    const mod = await import('@/app/actions/auctions.server');
    const createAuctionAction = mod.createAuctionAction;
    serverCreateAuction = async (payload: any) => {
      try {
        const res = await createAuctionAction(payload);
        return res || { success: false, error: 'Erreur' };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };
  } catch (e) {
    // ignore - fallback to API
  }

  return <NewAuctionClient serverCreateAuction={serverCreateAuction} />;
}
