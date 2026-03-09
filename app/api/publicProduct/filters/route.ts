import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { fetchFiltersServer } = await import('@/app/actions/publicProduct.server');
    const data = await fetchFiltersServer();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Filter API Error:', error);
    return NextResponse.json({ categories: [], regions: [], locations: [], climaticRegions: [] }, { status: 500 });
  }
}
