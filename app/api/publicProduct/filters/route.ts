import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const { ok, retryAfterSeconds } = checkRateLimit(`publicProductFilters:${getClientIp(request)}`);
    if (!ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const { fetchFiltersServer } = await import('@/features/products/actions/get-catalogue-products');
    const data = await fetchFiltersServer();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Filter API Error:', error);
    return NextResponse.json({ categories: [], regions: [], locations: [], climaticRegions: [] }, { status: 500 });
  }
}
