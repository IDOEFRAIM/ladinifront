import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, and, or, ilike, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const category = searchParams.get('category');
        const region = searchParams.get('region');
        const search = searchParams.get('search');

        const conditions: (SQL | undefined)[] = [];

        // Filtre Category
        if (category && category !== 'all') {
            conditions.push(ilike(schema.products.categoryLabel, `%${category}%`));
        }

        // Recherche
        if (search) {
            conditions.push(
                or(
                    ilike(schema.products.categoryLabel, `%${search}%`),
                    ilike(schema.products.name, `%${search}%`),
                )
            );
        }

        // Filtre par zone/region via producer.zone or producer.region
        if (region && region !== 'all') {
            const matchingProducers = await db
                .select({ id: schema.producers.id })
                .from(schema.producers)
                .leftJoin(schema.zones, eq(schema.producers.zoneId, schema.zones.id))
                .where(
                    or(
                        ilike(schema.zones.name, `%${region}%`),
                        ilike(schema.producers.region, `%${region}%`),
                    )
                );
            const producerIds = matchingProducers.map(p => p.id);
            if (producerIds.length > 0) {
                conditions.push(inArray(schema.products.producerId, producerIds));
            } else {
                return NextResponse.json([]);
            }
        }

        // Execution de la requete
        const products = await db.query.products.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                producer: {
                    with: {
                        user: { columns: { name: true, phone: true } },
                        zone: { columns: { id: true, name: true, code: true } },
                    }
                },
            },
            orderBy: (t, { desc: d }) => [d(t.createdAt)],
        });

        // Mapping Data
        const formattedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.categoryLabel, 
            categoryLabel: p.categoryLabel,
            price: p.price,
            unit: p.unit,
            quantity: p.quantityForSale,
            quantityForSale: p.quantityForSale,
            images: p.images,
            description: p.description,
            audioUrl: p.audioUrl,
            location: { 
                address: p.producer?.region || p.producer?.zone?.name || 'Localisation inconnue',
                latitude: null,
                longitude: null,
            },
            producer: {
                name: p.producer?.businessName || p.producer?.user?.name || "Producteur",
                phone: p.producer?.user?.phone || null,
                location: p.producer?.region || p.producer?.zone?.name || 'Non précisé',
                zone: p.producer?.zone ? { id: p.producer.zone.id, name: p.producer.zone.name } : null,
            },
            stock: p.quantityForSale,
            status: p.quantityForSale > 0 ? 'active' : 'sold_out',
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }));

        return NextResponse.json(formattedProducts);
    } catch (error) {
        console.error("[API_PUBLIC_PRODUCTS_ERROR]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
