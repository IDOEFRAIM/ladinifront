import { NextResponse } from 'next/server';
import { asError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { createAuctionAction } = await import('@/features/auction/actions/auction.actions');
    const res = await createAuctionAction(body);
    if (!res || !res.success) {
      return NextResponse.json({ success: false, error: res?.error || 'Erreur interne' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('POST /api/auctions error', e);
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
