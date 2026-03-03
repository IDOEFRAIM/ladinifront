import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> } // Segment dynamique
) {
  try {
    const { productId } = await params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      // On inclut les infos du producteur pour l'UI
      include: {
        producer: {
          include: {
            user: {
              select: { name: true, image: true }
            }
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Détail Produit Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}