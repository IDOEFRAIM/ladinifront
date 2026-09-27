import { NextResponse } from 'next/server';
import { awardAuctionAction } from '@/features/auction/actions/auction.actions';
import { getAccessContext } from '@/lib/api-guard';
import { asError } from '@/lib/errors';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Le créateur (BUYER) ou un admin peut attribuer — la vérification fine est dans le service
  const { ctx, error } = await getAccessContext(['SUPERADMIN', 'ADMIN', 'BUYER']);
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const { winnerBidId } = body;
    if (!winnerBidId) return NextResponse.json({ error: 'winnerBidId requis' }, { status: 400 });
    const res = await awardAuctionAction({ auctionId: id, winnerBidId });
    if (!res.success) return NextResponse.json({ error: (res as any).error }, { status: 400 });
    return NextResponse.json({ data: (res as any).data });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('POST /award error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
