import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { ctx, error } = await getAccessContext();
  if (error) return error;

  const { id } = params;
  try {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        targetZone: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
      },
    });
    if (!auction) return NextResponse.json({ error: 'Enchère introuvable' }, { status: 404 });
    return NextResponse.json({ data: auction });
  } catch (e: any) {
    console.error('GET /api/auctions/[id] error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
