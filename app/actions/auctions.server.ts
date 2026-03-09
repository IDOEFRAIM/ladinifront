// app/actions/auctions.server.ts
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { getEligibleProducers, submitBid, awardAuction, createAuction } from '@/services/auction.service';

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

export async function fetchEligibleProducers(params: { auctionId: string; subCategoryId?: string; targetZoneId?: string; limit?: number; }) {
  return await getEligibleProducers(params as any);
}

export async function submitAuctionBid(input: { auctionId: string; offeredPrice: number; }) {
  return await submitBid(input as any);
}

export async function awardAuctionAction(input: { auctionId: string; winnerBidId: string; }) {
  return await awardAuction(input as any);
}

export async function createAuctionAction(input: any) {
  return await createAuction(input as any);
}
