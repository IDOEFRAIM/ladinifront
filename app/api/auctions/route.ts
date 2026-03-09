import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { createAuctionAction } = await import('@/app/actions/auctions.server');
    const res = await createAuctionAction(body);
    if (!res || !res.success) {
      return NextResponse.json({ success: false, error: res?.error || 'Erreur interne' }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: res.data });
  } catch (e: any) {
    console.error('POST /api/auctions error', e);
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}
