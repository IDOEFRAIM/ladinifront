import { NextResponse } from 'next/server';
import { fetchProductByIdServer } from '@/app/actions/publicProduct.safe.server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });

    const product = await fetchProductByIdServer(productId);
    if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Détail Produit Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}