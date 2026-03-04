import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> } // Segment dynamique
) {
  try {
    const { productId } = await params;

    const product = await db.query.products.findFirst({
      where: eq(schema.products.id, productId),
      with: {
        producer: {
          with: {
            user: {
              columns: { name: true, image: true }
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