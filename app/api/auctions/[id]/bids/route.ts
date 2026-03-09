import { NextResponse } from 'next/server';
import { submitAuctionBid } from '@/app/actions/auctions.server';
import { getAccessContext } from '@/lib/api-guard';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext(['PRODUCER']);
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const { offeredPrice } = body;
    if (typeof offeredPrice !== 'number' || offeredPrice <= 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 });
    }
    const res = await submitAuctionBid({ auctionId: id, offeredPrice });
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ data: res.data });
  } catch (e: any) {
    console.error('POST /bids error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
