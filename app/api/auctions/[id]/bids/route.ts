import { NextResponse } from 'next/server';
import { submitAuctionBid, fetchBidsForAuction } from '@/app/actions/auctions.server';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext();
  if (error) return error;

  const { id } = await context.params;
  try {
    const res = await fetchBidsForAuction(id);
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ data: res.data });
  } catch (e: any) {
    console.error('GET /bids error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext(['PRODUCER']);
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const { offeredPrice, message } = body;
    if (typeof offeredPrice !== 'number' || offeredPrice <= 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 });
    }
    const res = await submitAuctionBid({ auctionId: id, offeredPrice, message });
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    if (!('data' in res)) return NextResponse.json({ error: 'Réponse invalide du serveur' }, { status: 500 });
    return NextResponse.json({ data: res.data });
  } catch (e: any) {
    console.error('POST /bids error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
