import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await getAccessContext();
  if (error) return error;

  const { id } = await context.params;
  try {
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, id),
      with: {
        targetZone: { columns: { id: true, name: true } },
      },
    });
    if (!auction) return NextResponse.json({ error: 'Enchère introuvable' }, { status: 404 });

    // Fetch subCategory separately since the relation is not defined on auctions
    let subCategory = null;
    if (auction.subCategoryId) {
      subCategory = await db.query.subCategories.findFirst({
        where: eq(schema.subCategories.id, auction.subCategoryId),
        columns: { id: true, name: true },
      });
    }

    return NextResponse.json({ data: { ...auction, subCategory } });
  } catch (e: any) {
    console.error('GET /api/auctions/[id] error', e);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
