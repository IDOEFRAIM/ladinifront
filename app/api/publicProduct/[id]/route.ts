import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: "ID manquant" }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: id },
            include: {
                producer: {
                    include: {
                        user: {
                            select: {
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

        // Mapping Data pour correspondre au Frontend
        const formattedProduct = {
            id: product.id,
            name: product.name,
            category: product.categoryLabel, 
            categoryLabel: product.categoryLabel,
            price: product.price,
            unit: product.unit,
            quantity: product.quantityForSale,
            stock: product.quantityForSale, // Double mapping
            description: product.description,
            images: product.images,
            audioUrl: product.audioUrl,
            status: product.quantityForSale > 0 ? 'active' : 'sold_out',
            location: {
                address: [product.producer.commune, product.producer.region].filter(Boolean).join(', ') || 'Localisation inconnue',
                latitude: 0,
                longitude: 0
            },
            producer: {
                name: product.producer.businessName || product.producer.user.name || "Producteur",
                location: [product.producer.commune, product.producer.region].filter(Boolean).join(', '),
                phone: product.producer.user.phone
            },
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };

        return NextResponse.json(formattedProduct);

    } catch (error) {
        console.error("PRISMA ERROR:", error);
        return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
    }
}