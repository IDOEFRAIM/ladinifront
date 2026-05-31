import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import {
  getBuyerDashboardProfile,
  getBuyerActiveOrders,
  getBuyerOrderHistory,
  getBuyerAuctionHistory,
  getBuyerBillingSummary,
} from '@/services/buyer.service';
import { getBuyerPreorders, type BuyerPreorder } from '@/services/preorder.service';
import { suggestedProducts } from '@/services/crossSelling.service';

const ALLOWED_SECTIONS = new Set(['all', 'profile', 'orders', 'auctions', 'billing', 'preorders', 'suggestions']);

export async function GET(req: NextRequest) {
  const { ctx, error } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const requestedSection = url.searchParams.get('section') || 'all';
    const section = ALLOWED_SECTIONS.has(requestedSection) ? requestedSection : 'all';
    const userId = ctx!.userId;

    const data = {
      profile: null as Awaited<ReturnType<typeof getBuyerDashboardProfile>> | null,
      activeOrders: [] as Awaited<ReturnType<typeof getBuyerActiveOrders>>,
      orderHistory: [] as Awaited<ReturnType<typeof getBuyerOrderHistory>>,
      auctions: { active: [], won: [], lost: [] } as Awaited<ReturnType<typeof getBuyerAuctionHistory>>,
      billingSummary: null as Awaited<ReturnType<typeof getBuyerBillingSummary>> | null,
      preorders: [] as BuyerPreorder[],
      suggestedProducts: [] as Awaited<ReturnType<typeof suggestedProducts>>,
    };

    const promises: Promise<void>[] = [];

    if (section === 'all' || section === 'profile') {
      promises.push(getBuyerDashboardProfile(userId).then((res) => { data.profile = res; }));
    }
    if (section === 'all' || section === 'orders') {
      promises.push(getBuyerActiveOrders(userId).then((res) => { data.activeOrders = res; }));
      promises.push(getBuyerOrderHistory(userId).then((res) => { data.orderHistory = res; }));
    }
    if (section === 'all' || section === 'auctions') {
      promises.push(getBuyerAuctionHistory(userId).then((res) => { data.auctions = res; }));
    }
    if (section === 'all' || section === 'billing') {
      promises.push(getBuyerBillingSummary(userId).then((res) => { data.billingSummary = res; }));
    }
    if (section === 'all' || section === 'preorders') {
      promises.push(getBuyerPreorders(userId).then((res) => {
        data.preorders = res.success && Array.isArray(res.data) ? res.data : [];
      }));
    }
    if (section === 'all' || section === 'suggestions') {
      promises.push(suggestedProducts(userId).then((res) => { data.suggestedProducts = res; }));
    }

    await Promise.all(promises);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[buyer/dashboard] error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
