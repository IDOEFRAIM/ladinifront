import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import {
  getBuyerDashboardProfile,
  getBuyerActiveOrders,
  getBuyerOrderHistory,
  getBuyerAuctionHistory,
} from '@/services/buyer.service';
import { suggestedProducts } from '@/services/crossSelling.service';

/**
 * GET /api/buyer/dashboard
 * Dashboard complet de l'acheteur : profil, commandes actives, historique, enchères, suggestions.
 * Query params: ?section=all|orders|auctions|suggestions
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get('section') || 'all';
    const userId = session.userId;

    // Initialisation avec les clés attendues par l'interface DashboardData du Hook
    // Cela évite que le front reçoive "undefined" sur certaines propriétés
    const data: any = {
      profile: null,
      activeOrders: [],
      orderHistory: [],
      auctions: { active: [], won: [], lost: [] },
      suggestedProducts: []
    };

    // OPTIMISATION : Lancer les appels en parallèle pour éviter les lenteurs
    const promises: Promise<void>[] = [];

    if (section === 'all' || section === 'profile') {
      promises.push(getBuyerDashboardProfile(userId).then(res => { data.profile = res; }));
    }

    if (section === 'all' || section === 'orders') {
      promises.push(getBuyerActiveOrders(userId).then(res => { data.activeOrders = res; }));
      promises.push(getBuyerOrderHistory(userId).then(res => { data.orderHistory = res; }));
    }

    if (section === 'all' || section === 'auctions') {
      promises.push(getBuyerAuctionHistory(userId).then(res => { data.auctions = res; }));
    }

    if (section === 'all' || section === 'suggestions') {
      promises.push(suggestedProducts(userId).then(res => { data.suggestedProducts = res; }));
    }

    await Promise.all(promises);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /api/buyer/dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}