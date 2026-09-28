import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import getUserIdFromSession from '@/lib/get-userId';
import { asError } from '@/lib/errors';
import { bidPricingView, rankByComparableTotal, snapshotFromBid } from '@/features/auction/pricing/bid-pricing';
import { buildAwardDecision, fingerprintOf } from '@/features/auction/pricing/award-decision';

export async function getBidsForAuction(auctionId: string) {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const auction = await db.query.auctions.findFirst({
      where: eq(schema.auctions.id, auctionId),
      columns: { id: true, buyerId: true, status: true, maxPricePerUnit: true, quantity: true, unit: true },
    });
    if (!auction) return { success: false, error: 'Enchère introuvable' };

    // Check access: only auction creator, admin, or bid participants
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { id: true, role: true } });
    // `auctions.buyer_id` référence `buyer_profiles.id` ; on accepte aussi l'identifiant utilisateur (enchères
    // historiques créées par le web) — MÊME convention transitoire que `services/auction-award.ts::awardAuction`
    // (l'autorité réelle reste ce contrôle côté serveur à l'attribution ; ceci ne fait que décider l'affichage).
    const profile = await db.query.buyerProfiles.findFirst({ where: eq(schema.buyerProfiles.userId, userId), columns: { id: true } });
    const isOwner = auction.buyerId === userId || (profile != null && auction.buyerId === profile.id);
    const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

    const bidsResult = await db.query.bids.findMany({
      where: eq(schema.bids.auctionId, auctionId),
      orderBy: [desc(schema.bids.createdAt)],
      with: {
        producer: {
          columns: { id: true, businessName: true, zoneId: true },
          with: { user: { columns: { id: true, name: true } } },
        },
      },
    });

    const terms = { quantity: auction.quantity, unit: auction.unit };

    // Classement par TOTAL COMPARABLE (jamais `offeredPrice` brut) — voir `pricing/bid-pricing.ts::rankByComparableTotal`.
    // Un bid non certifié (base inconnue) n'est jamais "le meilleur" : il vient après, non comparable.
    const ranked = rankByComparableTotal(
      bidsResult.map((b) => ({ id: b.id, createdAt: b.createdAt, view: bidPricingView(b, terms) })),
    );
    const bestBidId = ranked.find((r) => r.view.comparable)?.id ?? null;

    const bids = bidsResult.map((b, idx) => {
      const view = bidPricingView(b, terms);
      // Empreinte des TERMES ACTUELS — c'est CE QUE l'acheteur confirme ; `awardAuction` la revalide sous verrou.
      let award: { fingerprint: string; total: string } | null = null;
      if (view.certified && view.snapshot) {
        try {
          const decision = buildAwardDecision(b, { id: auction.id, buyerId: auction.buyerId, quantity: auction.quantity, unit: auction.unit });
          award = { fingerprint: fingerprintOf(decision), total: decision.awardTotal.toFixed() };
        } catch {
          award = null; // total incompatible avec l'enchère (ex: conditionnement non divisible) : non attribuable
        }
      }
      return {
        id: b.id,
        producerId: b.producerId,
        producerName: isOwner || isAdmin ? (b.producer?.user?.name ?? b.producer?.businessName ?? 'Producteur') : `Producteur #${idx + 1}`,
        // Champ hérité CONSERVÉ pour compatibilité (jamais réinterprété comme "par unité de l'enchère") :
        offeredPrice: b.offeredPrice,
        offeredPriceBasis: b.offeredPriceBasis,
        // Sémantique propre au bid — ce qui doit être affiché :
        pricingLabel: view.label,
        pricingCertified: view.certified,
        comparableTotal: view.comparableTotal,
        normalizedLabel: view.normalizedLabel,
        comparable: view.comparable,
        award,
        // Ce que le bouton "Attribuer" côté UI doit lire — jamais recalculé dans le composant. Le serveur
        // (`awardAuction`) reste seul AUTORITAIRE : ce booléen est une commodité d'affichage, pas une permission.
        awardable: view.comparable && award !== null && String(b.status || '').toUpperCase() === 'PENDING',
        message: b.message,
        status: b.status,
        isWinner: b.isWinner,
        isBestBid: b.id === bestBidId,
        linkedStockId: b.linkedStockId,
        estimatedDeliveryDate: b.estimatedDeliveryDate ?? null,
        createdAt: b.createdAt,
      };
    });

    const bestBid = bids.find((b) => b.id === bestBidId) ?? null;

    return {
      success: true,
      data: {
        auctionId,
        auctionStatus: auction.status,
        totalBids: bids.length,
        bestBidPrice: bestBid?.comparableTotal ?? null,
        // L'UI n'affiche le flux d'attribution que pour le propriétaire (ou un admin) — le serveur revérifie
        // quand même l'appartenance à l'attribution (`awardAuction`), ceci ne fait que piloter le rendu.
        viewerCanAward: isOwner || isAdmin,
        bids,
      },
    };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getBidsForAuction error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// ── Annulation d'une enchère ──────────────────────────────────────────

export async function getMyBids() {
  const userId = await getUserIdFromSession();
  if (!userId) return { success: false, error: 'Session expirée' };

  try {
    const producer = await db.query.producers.findFirst({ where: eq(schema.producers.userId, userId), columns: { id: true } });
    if (!producer) return { success: false, error: 'Profil producteur introuvable' };

    const results = await db.query.bids.findMany({
      where: eq(schema.bids.producerId, producer.id),
      orderBy: [desc(schema.bids.createdAt)],
      with: {
        auction: {
          columns: { id: true, status: true, quantity: true, unit: true, maxPricePerUnit: true, deadline: true, subCategoryId: true },
          with: { subCategory: { columns: { id: true, name: true } } },
        },
      },
    });

    return {
      success: true,
      data: results.map(b => {
        const view = b.auction ? bidPricingView(b, { quantity: b.auction.quantity, unit: b.auction.unit }) : null;
        return {
          id: b.id,
          auctionId: b.auctionId,
          offeredPrice: b.offeredPrice,
          pricingLabel: view?.label ?? (snapshotFromBid(b) ? null : 'Base de prix à préciser'),
          pricingCertified: view?.certified ?? false,
          status: b.status,
          isWinner: b.isWinner,
          message: b.message,
          notifiedAt: b.notifiedAt,
          auctionStatus: b.auction?.status,
          subCategoryName: b.auction?.subCategory?.name ?? 'Produit',
          auctionQuantity: b.auction?.quantity,
          auctionUnit: b.auction?.unit,
          auctionDeadline: b.auction?.deadline,
          createdAt: b.createdAt,
        };
      }),
    };
  } catch (_e: unknown) {
    const e = asError(_e);
    console.error('getMyBids error:', e);
    return { success: false, error: 'Erreur interne' };
  }
}

// Récupère une enchère par id
