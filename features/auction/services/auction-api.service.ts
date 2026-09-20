// Lecture d'une enchère (fiche + sous-catégorie) pour la route REST GET /api/auctions/[id].
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function fetchAuctionById(id: string) {
  const auction = await db.query.auctions.findFirst({
    where: eq(schema.auctions.id, id),
    with: { targetZone: { columns: { id: true, name: true } } },
  });

  if (!auction) return null;

  let subCategory = null;
  if (auction.subCategoryId) {
    subCategory = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, auction.subCategoryId), columns: { id: true, name: true } });
  }

  return { ...auction, subCategory };
}
