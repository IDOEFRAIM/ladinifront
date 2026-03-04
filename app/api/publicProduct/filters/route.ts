import { NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { gt } from 'drizzle-orm';

export async function GET() {
    try {
        // 1. Catégories uniques des produits actifs
        const productsCategories = await db
            .selectDistinct({ categoryLabel: schema.products.categoryLabel })
            .from(schema.products)
            .where(gt(schema.products.quantityForSale, 0));

        // 2. Locations actives
        const activeLocations = await db.query.zones.findMany({
            columns: { id: true, name: true, code: true },
            orderBy: (t, { asc: a }) => [a(t.name)],
            limit: 200,
        });

        // 3. Régions climatiques
        const climaticRegionsData = await db.query.climaticRegions.findMany({
            columns: { id: true, name: true, description: true },
            orderBy: (t, { asc: a }) => [a(t.name)],
        });

        const categories = productsCategories
            .map(p => p.categoryLabel)
            .filter(Boolean)
            .sort();

        // Backward compatible: return location names as "regions" for existing clients
        const regions = activeLocations.map(l => l.name);

        return NextResponse.json({
            categories,
            regions,
            locations: activeLocations,
            climaticRegions: climaticRegionsData,
        });

    } catch (error) {
        console.error("Filter API Error:", error);
        return NextResponse.json({ categories: [], regions: [], locations: [], climaticRegions: [] }, { status: 500 });
    }
}
