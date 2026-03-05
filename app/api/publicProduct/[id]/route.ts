import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID manquant" }, { status: 400 });
        }

        const product = await db.query.products.findFirst({
            where: eq(schema.products.id, id),
            with: {
                producer: {
                    with: {
                        user: {
                            columns: {
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        if (!product) {
            return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
        }

        // Mapping Data pour correspondre au Frontend (avec garde contre les valeurs manquantes)
        const producer = product.producer ?? null;
        const producerUser = producer?.user ?? null;

        const formattedProduct = {
            id: product.id,
            name: product.name || 'Produit',
            category: product.categoryLabel || null,
            categoryLabel: product.categoryLabel || null,
            price: product.price ?? 0,
            unit: product.unit ?? '',
            quantity: product.quantityForSale ?? 0,
            stock: product.quantityForSale ?? 0,
            description: product.description || '',
            images: Array.isArray(product.images) ? product.images : [],
            audioUrl: product.audioUrl || null,
            status: (product.quantityForSale ?? 0) > 0 ? 'active' : 'sold_out',
            location: {
                address: producer ? [producer.commune, producer.region].filter(Boolean).join(', ') : 'Localisation inconnue',
                latitude: 0,
                longitude: 0
            },
            producer: {
                name: producer?.businessName || producerUser?.name || 'Producteur',
                location: producer ? [producer.commune, producer.region].filter(Boolean).join(', ') : '',
                phone: producerUser?.phone || null
            },
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };

        return NextResponse.json(formattedProduct);

    } catch (error) {
        console.error("DB ERROR:", error);
        return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
    }
}