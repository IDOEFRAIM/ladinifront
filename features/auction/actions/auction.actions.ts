'use server';

// Enchères — offres, attribution, création, annulation et lectures.
// Ancienne version (app/actions/auctions.server.ts) : simples délégations sans garde, `any` partout ;
// createAuction n'exigeait qu'une session (un producteur pouvait lancer une enchère acheteur).
// Rôles alignés sur les routes REST /api/auctions/* ; SUPERADMIN contourne (getAccessContext).
import { z } from 'zod';
import { secureAction, idArg } from '@/lib/action-guard';
import * as svc from '@/features/auction/services/auction.service';

const BUYER_SIDE = ['SUPERADMIN', 'ADMIN', 'BUYER'] as const;
const PRODUCER_SIDE = ['PRODUCER'] as const;

// Les bornes métier (prix > 0, deadline future…) sont contrôlées par le service avec des messages dédiés.
const eligibleArg = z.looseObject({ auctionId: idArg });
const bidArg = z.looseObject({ auctionId: idArg, offeredPrice: z.number(), message: z.string().max(2000).optional() });
const awardArg = z.looseObject({ auctionId: idArg, winnerBidId: idArg });
const cancelArg = z.looseObject({ auctionId: idArg, reason: z.string().max(1000).optional() });
const createArg = z.looseObject({
  subCategoryId: idArg,
  quantity: z.number(),
  maxPricePerUnit: z.number(),
  deadline: z.string().min(1),
  incoterm: z.string().min(1),
  deliveryLocation: z.string().min(1),
  deliveryDeadline: z.string().min(1),
});

export async function fetchEligibleProducers(a0: Parameters<typeof svc.getEligibleProducers>[0]) {
  return secureAction({ schema: z.tuple([eligibleArg]) }, [a0], svc.getEligibleProducers);
}

export async function submitAuctionBid(a0: Parameters<typeof svc.submitBid>[0]) {
  return secureAction({ roles: PRODUCER_SIDE, schema: z.tuple([bidArg]) }, [a0], svc.submitBid);
}

export async function awardAuctionAction(a0: Parameters<typeof svc.awardAuction>[0]) {
  return secureAction({ roles: BUYER_SIDE, schema: z.tuple([awardArg]) }, [a0], svc.awardAuction);
}

export async function createAuctionAction(a0: Parameters<typeof svc.createAuction>[0]) {
  return secureAction({ roles: BUYER_SIDE, schema: z.tuple([createArg]) }, [a0], svc.createAuction);
}

export async function fetchBidsForAuction(a0: string) {
  return secureAction({ schema: z.tuple([idArg]) }, [a0], svc.getBidsForAuction);
}

export async function cancelAuctionAction(a0: Parameters<typeof svc.cancelAuction>[0]) {
  return secureAction({ roles: BUYER_SIDE, schema: z.tuple([cancelArg]) }, [a0], svc.cancelAuction);
}

export async function getMyAuctionsAction() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getMyAuctions);
}

export async function getMyBidsAction() {
  return secureAction({ schema: z.tuple([]) }, [], svc.getMyBids);
}
