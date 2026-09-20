import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Keep this route thin and delegate all DB work to actions
export async function GET(request: Request) {
  try {
    const { ok, retryAfterSeconds } = checkRateLimit(`publicProduct:${getClientIp(request)}`);
    if (!ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const region = searchParams.get('region') || undefined;
    const search = searchParams.get('search') || undefined;

    const { fetchProductsServer } = await import('@/features/products/actions/get-catalogue-products');
    const data = await fetchProductsServer({ category, region, search });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API_PUBLIC_PRODUCTS_ERROR]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
