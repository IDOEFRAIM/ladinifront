import { NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { fetchAuctionById } from '@/app/actions/auctions.server';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext();
  if (error) return error;

  const { id } = await context.params;
  try {
    const auction = await fetchAuctionById(id);
    if (!auction) return NextResponse.json({ error: 'Enchère introuvable' }, { status: 404 });
    return NextResponse.json({ data: auction });
  } catch (e: any) {
    console.error('GET /api/auctions/[id] error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
