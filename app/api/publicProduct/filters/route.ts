import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // 1. Catégories uniques des produits actifs
        const productsCategories = await prisma.product.findMany({
            where: { quantityForSale: { gt: 0 } },
            select: { categoryLabel: true },
            distinct: ['categoryLabel']
        });

        // 2. Locations actives
        const activeLocations = await prisma.zone.findMany({
            select: { id: true, name: true, code: true },
            orderBy: { name: 'asc' },
            take: 200
        });

        // 3. Régions climatiques
        const climaticRegions = await prisma.climaticRegion.findMany({
            select: { id: true, name: true, description: true },
            orderBy: { name: 'asc' }
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
            climaticRegions,
        });

    } catch (error) {
        console.error("Filter API Error:", error);
        return NextResponse.json({ categories: [], regions: [], locations: [], climaticRegions: [] }, { status: 500 });
    }
}
