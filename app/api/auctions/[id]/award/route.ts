import { NextResponse } from 'next/server';
import { awardAuction } from '@/services/auction.service';
import { getAccessContext } from '@/lib/api-guard';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // Seuls SUPERADMIN et ADMIN (DR) peuvent attribuer
  const { ctx, error } = await getAccessContext(['SUPERADMIN', 'ADMIN']);
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json();
    const { winnerBidId } = body;
    if (!winnerBidId) return NextResponse.json({ error: 'winnerBidId requis' }, { status: 400 });
    const res = await awardAuction({ auctionId: id, winnerBidId });
    if (!res.success) return NextResponse.json({ error: (res as any).error }, { status: 400 });
    return NextResponse.json({ data: (res as any).data });
  } catch (e: any) {
    console.error('POST /award error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
