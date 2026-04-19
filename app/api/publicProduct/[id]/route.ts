import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

    const { fetchProductByIdServer } = await import('@/app/actions/publicProduct.safe.server');
    const product = await fetchProductByIdServer(id);
    if (!product) return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });

    return NextResponse.json(product);
  } catch (error) {
    console.error('DB ERROR:', error);
    return NextResponse.json({ error: 'Erreur interne serveur' }, { status: 500 });
  }
}