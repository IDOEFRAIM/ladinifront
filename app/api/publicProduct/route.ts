import { NextResponse } from 'next/server';

// Keep this route thin and delegate all DB work to actions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const region = searchParams.get('region') || undefined;
    const search = searchParams.get('search') || undefined;

    const { fetchProductsServer } = await import('@/app/actions/publicProduct.server');
    const data = await fetchProductsServer({ category, region, search });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API_PUBLIC_PRODUCTS_ERROR]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
