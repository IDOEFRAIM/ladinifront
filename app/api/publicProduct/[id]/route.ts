import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ok, retryAfterSeconds } = checkRateLimit(`publicProductById:${getClientIp(request)}`);
    if (!ok) {
      return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    const { fetchProductByIdServer } = await import('@/features/products/actions/get-catalogue-products');
    const product = await fetchProductByIdServer(id);
    if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });

    return NextResponse.json(product);
  } catch (error) {
    console.error('DB ERROR:', error);
    return NextResponse.json({ error: 'Erreur interne serveur' }, { status: 500 });
  }
}