import { NextResponse } from 'next/server';
import { getEligibleProducers } from '@/services/auction.service';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await getAccessContext();
  if (error) return error;

  const { id } = params;
  try {
    const res = await getEligibleProducers({ auctionId: id });
    if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ data: res.data });
  } catch (e: any) {
    console.error('GET eligible-producers error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
