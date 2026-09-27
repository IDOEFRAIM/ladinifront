import { NextResponse } from 'next/server';
import { cancelAuctionAction } from '@/features/auction/actions/auction.actions';
import { getAccessContext } from '@/lib/api-guard';
import { asError } from '@/lib/errors';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext(['SUPERADMIN', 'ADMIN', 'BUYER']);
  if (error) return error;

  const { id } = await context.params;
  try {
    const body = await req.json().catch(() => ({}));
    const { reason } = body;
    const res = await cancelAuctionAction({ auctionId: id, reason });
    if (!res.success) return NextResponse.json({ error: (res as any).error }, { status: 400 });
    return NextResponse.json({ data: (res as any).data });
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('POST /cancel error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
