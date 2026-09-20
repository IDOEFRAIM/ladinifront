// Enchères — consultation.
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';

export async function getMyAuctions() {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const results = await db.query.auctions.findMany({
      where: eq(schema.auctions.buyerId, userId),
      orderBy: [desc(schema.auctions.createdAt)],
      with: {
        subCategory: { columns: { id: true, name: true } },
        bids: { columns: { id: true } },
        winnerBid: {
          columns: { id: true, offeredPrice: true, producerId: true },
          with: { producer: { columns: { id: true, businessName: true } } },
        },
      },
    });

    return {
      success: true,
      data: results.map(a => ({
        id: a.id,
        subCategoryName: a.subCategory?.name ?? 'Produit inconnu',
        description: a.description,
        quantity: a.quantity,
        unit: a.unit,
        maxPricePerUnit: a.maxPricePerUnit,
        deadline: a.deadline,
        status: a.status,
        bidsCount: a.bids?.length ?? 0,
        winnerBid: a.winnerBid ? {
          id: a.winnerBid.id,
          offeredPrice: a.winnerBid.offeredPrice,
          producerName: a.winnerBid.producer?.businessName ?? 'Producteur',
        } : null,
        awardedAt: a.awardedAt,
        createdAt: a.createdAt,
      })),
    };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getMyAuctions error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// ── Mes bids (pour le producteur) ─────────────────────────────────────

export async function getAuctionById(id: string) {
  try {
    // Fetch auction with basic relations (buyer, targetZone, bids)
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, id),
      with: {
        buyer: true,
        targetZone: true,
        bids: true,
      },
    });

    if (!auction) return null;

    // Fetch subCategory name separately to avoid relying on Drizzle 'with' typing
    let subCategory = null;
    if (auction.subCategoryId) {
      subCategory = await db.query.subCategories.findFirst({ where: eq(schema.subCategories.id, auction.subCategoryId), columns: { id: true, name: true } });
    }

    return {
      ...auction,
      subCategory: subCategory ?? null,
    } as any;
  } catch (e) {
    console.error('getAuctionById error', e);
    return null;
  }
}

// Liste les enchères OPEN (avec filtres optionnels)

export async function getOpenAuctions(opts?: { subCategoryId?: string; zoneId?: string }) {
  try {
    const conditions = [eq(schema.auctions.status, 'OPEN')];
    
    if (opts?.subCategoryId) conditions.push(eq(schema.auctions.subCategoryId, opts.subCategoryId));
    if (opts?.zoneId) conditions.push(eq(schema.auctions.targetZoneId, opts.zoneId));

    const results = await db.query.auctions.findMany({
      where: and(...conditions),
      orderBy: (t, { asc }) => [asc(t.deadline)],
      with: {
        // Ces clés doivent correspondre EXACTEMENT aux noms dans auctionsRelations
        subCategory: { 
          columns: { id: true, name: true } 
        },
        bids: { 
          columns: { id: true } 
        },
      },
    });

    // Plus besoin de "as any", TypeScript comprend maintenant la structure
    return results.map(a => ({
      id: a.id,
      subCategoryName: a.subCategory?.name || "Produit inconnu",
      quantity: a.quantity,
      unit: a.unit,
      maxPricePerUnit: a.maxPricePerUnit,
      deadline: a.deadline,
      bidsCount: a.bids.length,
      targetZoneId: a.targetZoneId,
      status: a.status,
      autoExtend: a.autoExtend,
      escrowStatus: a.escrowStatus,
    }));
  } catch (e) {
    console.error('getOpenAuctions error:', e);
    return [];
  }
}
